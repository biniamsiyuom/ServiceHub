import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Wrench,
  Monitor,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ClipboardList,
  Edit2,
  Trash2,
  HardDrive,
  Wifi,
  Package,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Power,
  Info,
} from 'lucide-react'
import {
  categoryService,
  extractErrorMessage,
  type CategoryResponse,
} from '../services/categoryService'
import { useAppSelector } from '../store/hooks'

const FALLBACK_CATEGORIES: CategoryResponse[] = [
  {
    id: 1,
    name: 'Hardware',
    description: 'Computers, printers, and other physical equipment',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Software',
    description: 'Software installation and application issues',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Network',
    description: 'Connectivity, Wi-Fi, and network equipment',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Maintenance',
    description: 'Electrical, facility, and general maintenance',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

interface LocalRequest {
  id: string
  category: string
  [key: string]: unknown
}

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('hardware') || lower.includes('computer')) return HardDrive
  if (lower.includes('software') || lower.includes('it support') || lower.includes('app')) return Monitor
  if (lower.includes('network') || lower.includes('wifi') || lower.includes('internet')) return Wifi
  if (lower.includes('maintenance') || lower.includes('electrical') || lower.includes('repair')) return Wrench
  if (lower.includes('cleaning') || lower.includes('facility')) return Building2
  if (lower.includes('security') || lower.includes('safety')) return ShieldCheck
  if (lower.includes('asset') || lower.includes('equipment')) return Package
  return Layers
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const authUser = useAppSelector((state) => state.auth.user)
  const isAdmin = authUser?.role === 'ADMIN'

  const [categories, setCategories] = useState<CategoryResponse[]>(() => {
    try {
      const saved = localStorage.getItem('servicehub_categories')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: item.id || idx + 1,
            name: item.name || String(item),
            description: item.description || '',
            active: item.active !== false,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          }))
        }
      }
    } catch {
      // ignore
    }
    return FALLBACK_CATEGORIES
  })

  const [requests, setRequests] = useState<LocalRequest[]>(() => {
    try {
      const saved = localStorage.getItem('servicehub_requests')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Listen for request storage updates to keep request counts accurate
  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const savedRequests = localStorage.getItem('servicehub_requests')
        setRequests(savedRequests ? JSON.parse(savedRequests) : [])
      } catch {
        // ignore
      }
    }

    window.addEventListener('servicehub_requests_updated', handleStorageUpdate)
    window.addEventListener('storage', handleStorageUpdate)

    return () => {
      window.removeEventListener('servicehub_requests_updated', handleStorageUpdate)
      window.removeEventListener('storage', handleStorageUpdate)
    }
  }, [])

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Manual refresh callback
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await categoryService.getAll()
      if (Array.isArray(data)) {
        setCategories(data)
        localStorage.setItem('servicehub_categories', JSON.stringify(data))
      }
    } catch (err: unknown) {
      console.warn('Backend categories endpoint unreachable, using cached categories:', err)
      const cached = localStorage.getItem('servicehub_categories')
      if (!cached) {
        setCategories(FALLBACK_CATEGORIES)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load effect
  useEffect(() => {
    let isMounted = true

    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll()
        if (isMounted && Array.isArray(data)) {
          setCategories(data)
          localStorage.setItem('servicehub_categories', JSON.stringify(data))
        }
      } catch (err: unknown) {
        console.warn('Backend categories endpoint unreachable, using cached categories:', err)
        if (isMounted) {
          const cached = localStorage.getItem('servicehub_categories')
          if (!cached) {
            setCategories(FALLBACK_CATEGORIES)
          }
        }
      }
    }

    fetchCategories()

    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenAdd = () => {
    setEditingCategory(null)
    setFormName('')
    setFormDescription('')
    setFormActive(true)
    setErrorMessage(null)
    setShowForm(true)
  }

  const handleOpenEdit = (cat: CategoryResponse) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormDescription(cat.description || '')
    setFormActive(cat.active)
    setErrorMessage(null)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingCategory(null)
    setFormName('')
    setFormDescription('')
    setFormActive(true)
    setErrorMessage(null)
  }

  // Handle Create (POST /api/categories) or Update (PUT /api/categories/{id})
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanName = formName.trim()
    const cleanDesc = formDescription.trim()

    if (!cleanName) {
      setErrorMessage('Category name is required.')
      return
    }

    if (cleanName.length > 100) {
      setErrorMessage('Category name must not exceed 100 characters.')
      return
    }

    if (cleanDesc.length > 255) {
      setErrorMessage('Description must not exceed 255 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingCategory) {
        // PUT /api/categories/{id}
        const updated = await categoryService.update(editingCategory.id, {
          name: cleanName,
          description: cleanDesc,
          active: formActive,
        })

        const oldName = editingCategory.name
        setCategories((current) =>
          current.map((c) => (c.id === editingCategory.id ? updated : c)),
        )

        // If renamed, sync matching requests in local storage
        if (oldName !== cleanName) {
          try {
            const savedRequests = localStorage.getItem('servicehub_requests')
            if (savedRequests) {
              const list: LocalRequest[] = JSON.parse(savedRequests)
              const updatedList = list.map((r) =>
                r.category === oldName ? { ...r, category: cleanName } : r,
              )
              localStorage.setItem('servicehub_requests', JSON.stringify(updatedList))
              setRequests(updatedList)
              window.dispatchEvent(new Event('servicehub_requests_updated'))
            }
          } catch {
            // ignore
          }
        }

        setSuccessMessage(`Category "${cleanName}" successfully updated.`)
      } else {
        // POST /api/categories
        const created = await categoryService.create({
          name: cleanName,
          description: cleanDesc,
          active: formActive,
        })

        setCategories((current) => [...current, created])
        setSuccessMessage(`Category "${cleanName}" created successfully.`)
      }

      window.dispatchEvent(new Event('servicehub_categories_updated'))
      handleCancelForm()
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to save category.')
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Quick Toggle Active/Inactive (PATCH /api/categories/{id})
  const handleToggleActive = async (cat: CategoryResponse) => {
    try {
      const newActiveState = !cat.active
      const updated = await categoryService.patch(cat.id, {
        active: newActiveState,
      })

      setCategories((current) =>
        current.map((c) => (c.id === cat.id ? updated : c)),
      )
      setSuccessMessage(
        `Category "${cat.name}" is now ${newActiveState ? 'active' : 'inactive'}.`,
      )
      window.dispatchEvent(new Event('servicehub_categories_updated'))
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, 'Failed to toggle category status.'))
    }
  }

  // Handle Delete (DELETE /api/categories/{id})
  const handleDelete = async (cat: CategoryResponse) => {
    try {
      await categoryService.delete(cat.id)

      setCategories((current) => current.filter((c) => c.id !== cat.id))
      setDeleteConfirmId(null)
      setSuccessMessage(`Category "${cat.name}" was successfully deleted.`)
      window.dispatchEvent(new Event('servicehub_categories_updated'))
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to delete category.')
      setErrorMessage(msg)
      setDeleteConfirmId(null)
    }
  }

  // Filter categories by search keyword and active tab
  const filteredCategories = categories.filter((c) => {
    const query = search.toLowerCase()
    const matchesSearch =
      c.name.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query))

    if (!matchesSearch) return false

    if (activeTab === 'ACTIVE') return c.active
    if (activeTab === 'INACTIVE') return !c.active
    return true
  })

  if (!isAdmin) {
    return (
      <div className="categories-page">
        <section
          className="content-card"
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            maxWidth: '600px',
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>
            Access Restricted
          </h2>

          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Service Categories administration is restricted to <strong>Administrator</strong> accounts. You are currently signed in as <strong>{authUser?.fullName || 'User'}</strong> ({authUser?.role || 'Standard Account'}).
          </p>

          <button
            type="button"
            className="btn"
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            Return to Dashboard
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="categories-page">
      <section className="content-card">
        {/* Header */}
        <div className="section-heading">
          <div>
            <h2 className="section-title">Service Categories</h2>
            <p className="page-subtitle">
              Manage service categories synchronized with the ServiceHub backend API.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh categories from backend"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCw size={15} className={isLoading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className="btn"
                onClick={showForm ? handleCancelForm : handleOpenAdd}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={17} />
                <span>{showForm ? 'Close Form' : 'Add Category'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Non-admin notice */}
        {!isAdmin && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '13px',
              marginBottom: '18px',
            }}
          >
            <Info size={16} color="#64748b" />
            <span>
              You are signed in as a viewer. Administrator rights are required to create, edit, or delete categories.
            </span>
          </div>
        )}

        {/* Global Success Alert */}
        {successMessage && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '18px',
              fontSize: '14px',
            }}
          >
            <CheckCircle2 size={18} color="#059669" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Global Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '18px',
              fontSize: '14px',
            }}
          >
            <AlertCircle size={18} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Status Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div className="search-area" style={{ maxWidth: '420px', flex: 1, margin: 0 }}>
            <Search size={19} />
            <input
              className="search-input"
              placeholder="Search by category name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Active / Inactive Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                color: activeTab === 'ALL' ? '#1e293b' : '#64748b',
                boxShadow: activeTab === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              All ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'ACTIVE' ? '#ffffff' : 'transparent',
                color: activeTab === 'ACTIVE' ? '#1e293b' : '#64748b',
                boxShadow: activeTab === 'ACTIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Active ({categories.filter((c) => c.active).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INACTIVE')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'INACTIVE' ? '#ffffff' : 'transparent',
                color: activeTab === 'INACTIVE' ? '#1e293b' : '#64748b',
                boxShadow: activeTab === 'INACTIVE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Inactive ({categories.filter((c) => !c.active).length})
            </button>
          </div>
        </div>

        {/* Add / Edit Category Form */}
        {showForm && isAdmin && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '22px',
              borderRadius: '12px',
              marginBottom: '28px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '17px' }}>
              {editingCategory
                ? `Edit Category: ${editingCategory.name} (ID: #${editingCategory.id})`
                : 'Create New Category'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Telecommunications"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Detailed description of services belonging to this category..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  maxLength={255}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>Active (available for new service requests)</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : editingCategory
                    ? 'Update Category'
                    : 'Save Category'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelForm}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Categories Cards Grid */}
        <div className="category-grid">
          {filteredCategories.map((category) => {
            const Icon = getCategoryIcon(category.name)
            const count = requests.filter(
              (r) => r.category?.toLowerCase() === category.name.toLowerCase(),
            ).length
            const isConfirmingDelete = deleteConfirmId === category.id

            return (
              <div
                className="category-card"
                key={category.id || category.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '230px',
                  boxSizing: 'border-box',
                  opacity: category.active ? 1 : 0.72,
                  borderColor: category.active ? '#e2e8f0' : '#cbd5e1',
                  background: category.active ? '#ffffff' : '#f8fafc',
                  position: 'relative',
                }}
              >
                {/* Status indicator badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: category.active ? '#ecfdf5' : '#f1f5f9',
                    color: category.active ? '#059669' : '#64748b',
                    border: `1px solid ${category.active ? '#a7f3d0' : '#e2e8f0'}`,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: category.active ? '#10b981' : '#94a3b8',
                    }}
                  />
                  {category.active ? 'Active' : 'Inactive'}
                </div>

                {/* Card Top: Icon & Details */}
                <div style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}>
                  <div
                    className="category-icon"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      background: category.active ? '#eff6ff' : '#e2e8f0',
                      color: category.active ? '#2563eb' : '#64748b',
                      marginBottom: '12px',
                    }}
                  >
                    <Icon size={28} />
                  </div>

                  <div
                    className="category-name"
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      marginBottom: '6px',
                      color: '#0f172a',
                    }}
                  >
                    {category.name}
                  </div>

                  {category.description ? (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        margin: '0 0 12px 0',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={category.description}
                    >
                      {category.description}
                    </p>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: '0 0 12px 0' }}>
                      No description provided
                    </p>
                  )}
                </div>

                {/* Card Bottom: Metric & Action Buttons */}
                <div style={{ width: '100%', marginTop: 'auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <span
                      style={{
                        background: '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: '#475569',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <ClipboardList size={13} />
                      {count} {count === 1 ? 'Request' : 'Requests'}
                    </span>
                  </div>

                  {isAdmin && (
                    <div style={{ width: '100%' }}>
                      {isConfirmingDelete ? (
                        <div
                          style={{
                            background: '#fee2e2',
                            padding: '8px',
                            borderRadius: '8px',
                            textAlign: 'center',
                          }}
                        >
                          <p style={{ fontSize: '12px', color: '#991b1b', margin: '0 0 6px 0', fontWeight: 600 }}>
                            Confirm delete?
                          </p>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDelete(category)}
                              style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Yes, Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              style={{
                                background: '#ffffff',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleOpenEdit(category)}
                            title="Edit Category Details (PUT /api/categories/{id})"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                            }}
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(category)}
                            title={
                              category.active
                                ? 'Deactivate Category (PATCH /api/categories/{id})'
                                : 'Activate Category (PATCH /api/categories/{id})'
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: category.active ? '#475569' : '#059669',
                              cursor: 'pointer',
                            }}
                          >
                            <Power size={12} />
                            {category.active ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(category.id)}
                            title="Delete Category (DELETE /api/categories/{id})"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {filteredCategories.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            <Layers size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#334155' }}>
              No Categories Found
            </h4>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {search
                ? `No categories matched your search query "${search}".`
                : 'No categories currently available.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
