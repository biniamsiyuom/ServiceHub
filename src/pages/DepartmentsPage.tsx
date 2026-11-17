import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Building2,
  Monitor,
  Briefcase,
  Users,
  ShieldAlert,
  Layers,
  Edit2,
  Trash2,
  RotateCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  departmentService,
  extractErrorMessage,
  type DepartmentResponse,
} from '../services/departmentService'
import { useAppSelector } from '../store/hooks'

const FALLBACK_DEPARTMENTS: DepartmentResponse[] = [
  {
    id: 1,
    name: 'Information Technology',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Facilities',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Operations',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

interface LocalStaffUser {
  id: number
  department?: { id: number; name: string } | null
  [key: string]: unknown
}

function getDepartmentIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('technology') || lower.includes('it') || lower.includes('digital')) return Monitor
  if (lower.includes('facilities') || lower.includes('maintenance') || lower.includes('building')) return Building2
  if (lower.includes('operations') || lower.includes('operation')) return Briefcase
  if (lower.includes('human') || lower.includes('people') || lower.includes('hr')) return Users
  return Layers
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

export default function DepartmentsPage() {
  const navigate = useNavigate()
  const authUser = useAppSelector((state) => state.auth.user)
  const isAdmin = authUser?.role === 'ADMIN'

  const [departments, setDepartments] = useState<DepartmentResponse[]>(() => {
    try {
      const saved = localStorage.getItem('servicehub_departments')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: item.id || idx + 1,
            name: item.name || String(item),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          }))
        }
      }
    } catch {
      // ignore
    }
    return FALLBACK_DEPARTMENTS
  })

  const [staff, setStaff] = useState<LocalStaffUser[]>(() => {
    try {
      const saved = localStorage.getItem('servicehub_staff_users')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<DepartmentResponse | null>(null)
  const [formName, setFormName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Keep staff counts in sync with the Staff page
  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const savedStaff = localStorage.getItem('servicehub_staff_users')
        setStaff(savedStaff ? JSON.parse(savedStaff) : [])
      } catch {
        // ignore
      }
    }

    window.addEventListener('servicehub_departments_updated', handleStorageUpdate)
    window.addEventListener('storage', handleStorageUpdate)

    return () => {
      window.removeEventListener('servicehub_departments_updated', handleStorageUpdate)
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
      const data = await departmentService.getAll()
      if (Array.isArray(data)) {
        setDepartments(data)
        localStorage.setItem('servicehub_departments', JSON.stringify(data))
      }
    } catch (err: unknown) {
      console.warn('Backend departments endpoint unreachable, using cached departments:', err)
      const cached = localStorage.getItem('servicehub_departments')
      if (!cached) {
        setDepartments(FALLBACK_DEPARTMENTS)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load effect
  useEffect(() => {
    let isMounted = true

    const fetchDepartments = async () => {
      try {
        const data = await departmentService.getAll()
        if (isMounted && Array.isArray(data)) {
          setDepartments(data)
          localStorage.setItem('servicehub_departments', JSON.stringify(data))
        }
      } catch (err: unknown) {
        console.warn('Backend departments endpoint unreachable, using cached departments:', err)
        if (isMounted) {
          const cached = localStorage.getItem('servicehub_departments')
          if (!cached) {
            setDepartments(FALLBACK_DEPARTMENTS)
          }
        }
      }
    }

    fetchDepartments()

    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenAdd = () => {
    setEditingDepartment(null)
    setFormName('')
    setErrorMessage(null)
    setShowForm(true)
  }

  const handleOpenEdit = (department: DepartmentResponse) => {
    setEditingDepartment(department)
    setFormName(department.name)
    setErrorMessage(null)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingDepartment(null)
    setFormName('')
    setErrorMessage(null)
  }

  // Handle Create (POST /api/departments) or Update (PUT /api/departments/{id})
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanName = formName.trim()

    if (!cleanName) {
      setErrorMessage('Department name is required.')
      return
    }

    if (cleanName.length > 100) {
      setErrorMessage('Department name must not exceed 100 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingDepartment) {
        // PUT /api/departments/{id}
        const updated = await departmentService.update(editingDepartment.id, {
          name: cleanName,
        })

        setDepartments((current) =>
          current.map((d) => (d.id === editingDepartment.id ? updated : d)),
        )
        setSuccessMessage(`Department "${cleanName}" successfully updated.`)
      } else {
        // POST /api/departments
        const created = await departmentService.create({ name: cleanName })

        setDepartments((current) => [...current, created])
        setSuccessMessage(`Department "${cleanName}" created successfully.`)
      }

      window.dispatchEvent(new Event('servicehub_departments_updated'))
      handleCancelForm()
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save department.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete (DELETE /api/departments/{id})
  const handleDelete = async (department: DepartmentResponse) => {
    try {
      await departmentService.delete(department.id)

      setDepartments((current) => current.filter((d) => d.id !== department.id))
      setDeleteConfirmId(null)
      setSuccessMessage(`Department "${department.name}" was successfully deleted.`)
      window.dispatchEvent(new Event('servicehub_departments_updated'))
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, 'Failed to delete department.'))
      setDeleteConfirmId(null)
    }
  }

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase().trim()),
  )

  if (!isAdmin) {
    return (
      <div className="departments-page">
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

          <h2 style={{ fontSize: '24px', color: '#2f2c33', marginBottom: '8px', fontWeight: 700 }}>
            Access Restricted
          </h2>

          <p style={{ color: '#817e76', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Department administration is restricted to <strong>Administrator</strong> accounts. You are currently signed in as <strong>{authUser?.fullName || 'User'}</strong> ({authUser?.role || 'Standard Account'}).
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
    <div className="departments-page">
      <section className="content-card">
        {/* Header */}
        <div className="section-heading">
          <div>
            <h2 className="section-title">Departments</h2>
            <p className="page-subtitle">
              Manage organizational departments synchronized with the ServiceHub backend API.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh departments from backend"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCw size={15} className={isLoading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={showForm ? handleCancelForm : handleOpenAdd}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={17} />
              <span>{showForm ? 'Close Form' : 'Add Department'}</span>
            </button>
          </div>
        </div>

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

        {/* Search */}
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
              placeholder="Search by department name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <span
            style={{
              background: '#f1f2e9',
              color: '#5c5951',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            All ({departments.length})
          </span>
        </div>

        {/* Add / Edit Department Form */}
        {showForm && isAdmin && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#f8f9f3',
              border: '1px solid #d5d7c9',
              padding: '22px',
              borderRadius: '12px',
              marginBottom: '28px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '17px' }}>
              {editingDepartment
                ? `Edit Department: ${editingDepartment.name} (ID: #${editingDepartment.id})`
                : 'Create New Department'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                  Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Human Resources"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d5d7c9',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : editingDepartment
                    ? 'Update Department'
                    : 'Save Department'}
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

        {/* Departments Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Department</th>
                <th>Staff</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map((department) => {
                const Icon = getDepartmentIcon(department.name)
                const staffCount = staff.filter(
                  (member) =>
                    member.department &&
                    (member.department.id === department.id ||
                      member.department.name?.toLowerCase() === department.name.toLowerCase()),
                ).length
                const isConfirmingDelete = deleteConfirmId === department.id

                return (
                  <tr key={department.id || department.name}>
                    <td style={{ fontWeight: 700, color: '#3a3740' }}>#{department.id}</td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="list-icon">
                          <Icon size={16} />
                        </span>
                        <span className="list-title">{department.name}</span>
                      </div>
                    </td>

                    <td>
                      <span className="list-count">
                        <Users size={13} />
                        {staffCount} {staffCount === 1 ? 'Staff Member' : 'Staff Members'}
                      </span>
                    </td>

                    <td style={{ fontSize: '13px', color: '#817e76' }}>
                      {formatDate(department.createdAt)}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {isConfirmingDelete ? (
                        <div className="delete-confirm">
                          <span>Delete?</span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleDelete(department)}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Yes, delete
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setDeleteConfirmId(null)}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="list-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleOpenEdit(department)}
                            title="Edit Department (PUT /api/departments/{id})"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => setDeleteConfirmId(department.id)}
                            title="Delete Department (DELETE /api/departments/{id})"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredDepartments.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#817e76' }}>
            <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#4d4a45' }}>
              No Departments Found
            </h4>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {search
                ? `No departments matched your search query "${search}".`
                : 'No departments currently available.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
