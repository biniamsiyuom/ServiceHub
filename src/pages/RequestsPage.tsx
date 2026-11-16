import React, { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  Search,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  Edit2,
  UserCheck,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Tag,
  MapPin,
  Building,
  User,
  Send,
  X,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import {
  requestService,
  extractRequestErrorMessage,
  type ServiceRequestResponse,
  type Priority,
  type RequestStatus,
  type RequestCommentResponse,
  type RequestUserSummary,
} from '../services/requestService'
import { categoryService, type CategoryResponse } from '../services/categoryService'
import { useAppSelector } from '../store/hooks'

const DEFAULT_DEMO_REQUESTS: ServiceRequestResponse[] = [
  {
    id: 1,
    referenceNumber: 'REQ-2026-0001',
    title: 'Computer repair and OS reinstallation',
    description: 'Workstation in finance department fails to boot into Windows.',
    category: { id: 1, name: 'Hardware' },
    priority: 'HIGH',
    status: 'PENDING',
    location: 'Building A, Room 204',
    requester: { id: 4, email: 'employee@servicehub.local', fullName: 'Eve Employee' },
    department: { id: 1, name: 'Information Technology' },
    assignedTo: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    referenceNumber: 'REQ-2026-0002',
    title: 'Office deep cleaning and sanitization',
    description: 'Quarterly conference room carpet cleaning and air conditioning filter refresh.',
    category: { id: 4, name: 'Maintenance' },
    priority: 'LOW',
    status: 'IN_PROGRESS',
    location: 'Building B, Floor 3',
    requester: { id: 2, email: 'manager@servicehub.local', fullName: 'Mia Manager' },
    department: { id: 1, name: 'Information Technology' },
    assignedTo: { id: 3, email: 'tech@servicehub.local', fullName: 'Tom Technician' },
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    referenceNumber: 'REQ-2026-0003',
    title: 'Core switch network port flapping',
    description: 'Switch port 24 on 2nd floor distribution switch is disconnecting intermittently.',
    category: { id: 3, name: 'Network' },
    priority: 'CRITICAL',
    status: 'RESOLVED',
    location: 'Server Room B',
    requester: { id: 1, email: 'admin@servicehub.local', fullName: 'System Administrator' },
    department: { id: 1, name: 'Information Technology' },
    assignedTo: { id: 3, email: 'tech@servicehub.local', fullName: 'Tom Technician' },
    resolvedAt: new Date().toISOString(),
    closedAt: null,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function getPriorityBadge(priority: Priority) {
  switch (priority) {
    case 'CRITICAL':
      return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }
    case 'HIGH':
      return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' }
    case 'MEDIUM':
      return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
    case 'LOW':
    default:
      return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
  }
}

function getStatusBadge(status: RequestStatus) {
  switch (status) {
    case 'SUBMITTED':
      return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', label: 'Submitted' }
    case 'PENDING':
      return { bg: '#fef3c7', text: '#92400e', border: '#fde68a', label: 'Pending' }
    case 'ASSIGNED':
      return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', label: 'Assigned' }
    case 'IN_PROGRESS':
      return { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe', label: 'In Progress' }
    case 'RESOLVED':
      return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: 'Resolved' }
    case 'CLOSED':
      return { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb', label: 'Closed' }
  }
}

export default function RequestsPage() {
  const authUser = useAppSelector((state) => state.auth.user)
  const isAdmin = authUser?.role === 'ADMIN'
  const isManager = authUser?.role === 'MANAGER'
  const isTechnician = authUser?.role === 'TECHNICIAN'
  const isStaff = ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(authUser?.role || '')
  const canAssign = ['ADMIN', 'MANAGER'].includes(authUser?.role || '')

  const canEdit = (req: ServiceRequestResponse) => {
    if (isAdmin) return true
    if (req.requester?.id === authUser?.id && req.status !== 'CLOSED' && req.status !== 'RESOLVED') return true
    return false
  }

  const canChangeStatus = (req: ServiceRequestResponse) => {
    if (isAdmin || isManager) return true
    if (isTechnician && req.assignedTo?.id === authUser?.id) return true
    return false
  }

  const getPageSubtitle = () => {
    if (isAdmin) {
      return 'Manage, prioritize, and assign service requests across the organization.'
    }
    if (isManager) {
      return 'Review department requests, assign service technicians, and track progress.'
    }
    if (isTechnician) {
      return 'View and update your assigned service tasks and repair tickets.'
    }
    return 'Submit service requests and track your ticket resolution progress in real time.'
  }

  // Requests table state
  const [requests, setRequests] = useState<ServiceRequestResponse[]>(DEFAULT_DEMO_REQUESTS)
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [technicians, setTechnicians] = useState<RequestUserSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(DEFAULT_DEMO_REQUESTS.length)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  // Feedback notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<ServiceRequestResponse | null>(null)
  const [viewingRequest, setViewingRequest] = useState<ServiceRequestResponse | null>(null)
  const [assigningRequest, setAssigningRequest] = useState<ServiceRequestResponse | null>(null)
  const [statusChangingRequest, setStatusChangingRequest] = useState<ServiceRequestResponse | null>(null)

  // Form states
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<number | ''>('')
  const [formPriority, setFormPriority] = useState<Priority>('MEDIUM')
  const [formLocation, setFormLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Comments for viewing request
  const [comments, setComments] = useState<RequestCommentResponse[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newCommentText, setNewCommentText] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [isPostingComment, setIsPostingComment] = useState(false)

  // Assignment & Status state
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | ''>('')
  const [newStatusValue, setNewStatusValue] = useState<RequestStatus | ''>('')
  const [statusChangeNote, setStatusChangeNote] = useState('')

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Load Categories & Technicians lookup
  useEffect(() => {
    let isMounted = true

    const loadLookups = async () => {
      try {
        const cats = await categoryService.getAll(true)
        if (isMounted && Array.isArray(cats)) {
          setCategories(cats)
        }
      } catch {
        // ignore
      }

      if (canAssign) {
        try {
          const techs = await requestService.getTechnicians()
          if (isMounted && Array.isArray(techs)) {
            setTechnicians(techs)
          }
        } catch {
          // ignore
        }
      }
    }

    loadLookups()

    return () => {
      isMounted = false
    }
  }, [canAssign])

  // Fetch Requests (GET /api/requests)
  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const params = {
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        categoryId: categoryFilter !== 'ALL' ? Number(categoryFilter) : undefined,
        page,
        size: pageSize,
        sort: 'createdAt',
        direction: 'desc' as const,
      }

      const response = await requestService.list(params)
      setRequests(response.content)
      setTotalPages(response.totalPages)
      setTotalElements(response.totalElements)

      // Sync local storage format for dashboard counts / preview
      try {
        const localList = response.content.map((r) => ({
          id: r.referenceNumber || `SH-${r.id}`,
          service: r.title,
          category: r.category?.name || 'General',
          requester: r.requester?.fullName || 'User',
          status: r.status,
          priority: r.priority,
          location: r.location || '',
        }))
        localStorage.setItem('servicehub_requests', JSON.stringify(localList))
        window.dispatchEvent(new Event('servicehub_requests_updated'))
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      console.warn('Backend requests endpoint unreachable, using cached data:', err)
      const cached = localStorage.getItem('servicehub_requests')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRequests(
              parsed.map((item, idx) => ({
                id: item.id ? Number(String(item.id).replace(/\D/g, '')) || idx + 1 : idx + 1,
                referenceNumber: item.id || `REQ-2026-000${idx + 1}`,
                title: item.service || item.title || 'Service Request',
                description: item.description || 'Request description',
                category: { id: 1, name: item.category || 'Maintenance' },
                priority: (item.priority as Priority) || 'MEDIUM',
                status: (item.status as RequestStatus) || 'PENDING',
                location: item.location || '',
                requester: { id: 1, email: 'user@servicehub.local', fullName: item.requester || 'User' },
                department: { id: 1, name: 'IT' },
                assignedTo: null,
                resolvedAt: null,
                closedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })),
            )
          }
        } catch {
          setRequests(DEFAULT_DEMO_REQUESTS)
        }
      } else {
        setRequests(DEFAULT_DEMO_REQUESTS)
      }
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, priorityFilter, categoryFilter, page, pageSize])

  // Synchronize request list on filter / pagination change
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const params = {
          search: search.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          categoryId: categoryFilter !== 'ALL' ? Number(categoryFilter) : undefined,
          page,
          size: pageSize,
          sort: 'createdAt',
          direction: 'desc' as const,
        }

        const response = await requestService.list(params)
        if (!isMounted) return
        setRequests(response.content)
        setTotalPages(response.totalPages)
        setTotalElements(response.totalElements)

        try {
          const localList = response.content.map((r) => ({
            id: r.referenceNumber || `SH-${r.id}`,
            service: r.title,
            category: r.category?.name || 'General',
            requester: r.requester?.fullName || 'User',
            status: r.status,
            priority: r.priority,
            location: r.location || '',
          }))
          localStorage.setItem('servicehub_requests', JSON.stringify(localList))
          window.dispatchEvent(new Event('servicehub_requests_updated'))
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        if (!isMounted) return
        console.warn('Backend requests endpoint unreachable, using cached data:', err)
        const cached = localStorage.getItem('servicehub_requests')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRequests(
                parsed.map((item, idx) => ({
                  id: item.id ? Number(String(item.id).replace(/\D/g, '')) || idx + 1 : idx + 1,
                  referenceNumber: item.id || `REQ-2026-000${idx + 1}`,
                  title: item.service || item.title || 'Service Request',
                  description: item.description || 'Request description',
                  category: { id: 1, name: item.category || 'Maintenance' },
                  priority: (item.priority as Priority) || 'MEDIUM',
                  status: (item.status as RequestStatus) || 'PENDING',
                  location: item.location || '',
                  requester: { id: 1, email: 'user@servicehub.local', fullName: item.requester || 'User' },
                  department: { id: 1, name: 'IT' },
                  assignedTo: null,
                  resolvedAt: null,
                  closedAt: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })),
              )
            }
          } catch {
            setRequests(DEFAULT_DEMO_REQUESTS)
          }
        } else {
          setRequests(DEFAULT_DEMO_REQUESTS)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [search, statusFilter, priorityFilter, categoryFilter, page, pageSize])

  // Load comments for a selected request
  const loadComments = useCallback(async (requestId: number) => {
    setLoadingComments(true)
    try {
      const response = await requestService.listComments(requestId)
      setComments(response.content || [])
    } catch (err) {
      console.warn('Failed to load comments:', err)
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }, [])

  const handleOpenView = (request: ServiceRequestResponse) => {
    setViewingRequest(request)
    setNewCommentText('')
    setIsInternalComment(false)
    loadComments(request.id)
  }

  const handleOpenCreate = () => {
    setFormTitle('')
    setFormDescription('')
    setFormCategoryId(categories[0]?.id || '')
    setFormPriority('MEDIUM')
    setFormLocation('')
    setErrorMessage(null)
    setShowCreateModal(true)
  }

  const handleOpenEdit = (request: ServiceRequestResponse) => {
    setEditingRequest(request)
    setFormTitle(request.title)
    setFormDescription(request.description)
    setFormCategoryId(request.category?.id || '')
    setFormPriority(request.priority)
    setFormLocation(request.location || '')
    setErrorMessage(null)
  }

  // Handle Create Request (POST /api/requests)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!formTitle.trim()) {
      setErrorMessage('Title is required.')
      return
    }

    if (!formDescription.trim()) {
      setErrorMessage('Description is required.')
      return
    }

    if (!formCategoryId) {
      setErrorMessage('Please select a category.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await requestService.create({
        title: formTitle.trim(),
        description: formDescription.trim(),
        categoryId: Number(formCategoryId),
        priority: formPriority,
        location: formLocation.trim() || undefined,
      })

      setShowCreateModal(false)
      setSuccessMessage(`Request "${created.referenceNumber}" created successfully.`)
      fetchRequests()
    } catch (err: unknown) {
      setErrorMessage(extractRequestErrorMessage(err, 'Failed to create service request.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Update Request (PUT /api/requests/{id})
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRequest) return
    setErrorMessage(null)

    if (!formTitle.trim()) {
      setErrorMessage('Title is required.')
      return
    }

    if (!formDescription.trim()) {
      setErrorMessage('Description is required.')
      return
    }

    if (!formCategoryId) {
      setErrorMessage('Please select a category.')
      return
    }

    setIsSubmitting(true)
    try {
      await requestService.update(editingRequest.id, {
        title: formTitle.trim(),
        description: formDescription.trim(),
        categoryId: Number(formCategoryId),
        priority: formPriority,
        location: formLocation.trim() || undefined,
      })

      setEditingRequest(null)
      setSuccessMessage(`Request "${editingRequest.referenceNumber}" updated successfully.`)
      fetchRequests()
    } catch (err: unknown) {
      setErrorMessage(extractRequestErrorMessage(err, 'Failed to update service request.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Technician Assignment (PATCH /api/requests/{id}/assign)
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningRequest || !selectedTechnicianId) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const updated = await requestService.assignTechnician(assigningRequest.id, {
        technicianId: Number(selectedTechnicianId),
      })

      setAssigningRequest(null)
      setSelectedTechnicianId('')
      setSuccessMessage(
        `Request "${updated.referenceNumber}" assigned to ${updated.assignedTo?.fullName || 'Technician'}.`,
      )
      fetchRequests()
      if (viewingRequest?.id === updated.id) {
        setViewingRequest(updated)
      }
    } catch (err: unknown) {
      setErrorMessage(extractRequestErrorMessage(err, 'Failed to assign technician.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Status Transition (PATCH /api/requests/{id}/status)
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusChangingRequest || !newStatusValue) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const updated = await requestService.changeStatus(statusChangingRequest.id, {
        status: newStatusValue,
        note: statusChangeNote.trim() || undefined,
      })

      setStatusChangingRequest(null)
      setNewStatusValue('')
      setStatusChangeNote('')
      setSuccessMessage(`Status updated to ${updated.status} for "${updated.referenceNumber}".`)
      fetchRequests()
      if (viewingRequest?.id === updated.id) {
        setViewingRequest(updated)
      }
    } catch (err: unknown) {
      setErrorMessage(extractRequestErrorMessage(err, 'Failed to update status.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Adding a Comment (POST /api/requests/{id}/comments)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewingRequest || !newCommentText.trim()) return
    setIsPostingComment(true)

    try {
      const newComment = await requestService.addComment(viewingRequest.id, {
        content: newCommentText.trim(),
        internal: isInternalComment,
      })

      setComments((prev) => [...prev, newComment])
      setNewCommentText('')
      setIsInternalComment(false)
    } catch (err: unknown) {
      setErrorMessage(extractRequestErrorMessage(err, 'Failed to add comment.'))
    } finally {
      setIsPostingComment(false)
    }
  }

  return (
    <div className="requests-page">
      <section className="content-card">
        {/* Header Section */}
        <div className="section-heading">
          <div>
            <h2 className="section-title">Service Requests</h2>
            <p className="page-subtitle">{getPageSubtitle()}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchRequests}
              disabled={isLoading}
              title="Refresh requests"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCw size={15} className={isLoading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={handleOpenCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={17} />
              <span>New Request</span>
            </button>
          </div>
        </div>

        {/* Global Success Banner */}
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

        {/* Global Error Banner */}
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
              style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '20px',
            background: '#f8fafc',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Search Query */}
          <div className="search-area" style={{ flex: '1 1 240px', margin: 0 }}>
            <Search size={18} />
            <input
              className="search-input"
              placeholder="Search reference, title, location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Priority:</label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setPage(0)
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setPage(0)
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Requests Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Service &amp; Details</th>
                <th>Category</th>
                <th>Requester</th>
                <th>Technician</th>
                <th>Priority</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const pBadge = getPriorityBadge(req.priority)
                const sBadge = getStatusBadge(req.status)

                return (
                  <tr key={req.id}>
                    {/* Reference # */}
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>
                      {req.referenceNumber || `REQ-${req.id}`}
                    </td>

                    {/* Title & Location */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{req.title}</div>
                      {req.location && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                          }}
                        >
                          <MapPin size={12} />
                          <span>{req.location}</span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td>
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#334155',
                        }}
                      >
                        {req.category?.name || 'General'}
                      </span>
                    </td>

                    {/* Requester */}
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {req.requester?.fullName || 'User'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {req.requester?.email || ''}
                      </div>
                    </td>

                    {/* Assigned Technician */}
                    <td>
                      {req.assignedTo ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            color: '#0369a1',
                            fontWeight: 600,
                          }}
                        >
                          <UserCheck size={14} />
                          <span>{req.assignedTo.fullName}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Priority Badge */}
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: pBadge.bg,
                          color: pBadge.text,
                          border: `1px solid ${pBadge.border}`,
                        }}
                      >
                        {req.priority}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: sBadge.bg,
                          color: sBadge.text,
                          border: `1px solid ${sBadge.border}`,
                        }}
                      >
                        {sBadge.label}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* View Details */}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenView(req)}
                          title="View Request Details & Comments"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {/* Edit Request (Admin or Author of open request) */}
                        {canEdit(req) && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleOpenEdit(req)}
                            title="Edit Request (PUT /api/requests/{id})"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}

                        {/* Assign (Admin & Manager) */}
                        {canAssign && req.status !== 'RESOLVED' && req.status !== 'CLOSED' && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setAssigningRequest(req)
                              setSelectedTechnicianId(req.assignedTo?.id || '')
                            }}
                            title="Assign Technician (PATCH /api/requests/{id}/assign)"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            <UserCheck size={13} />
                          </button>
                        )}

                        {/* Change Status (Admin, Manager, or Assigned Technician) */}
                        {canChangeStatus(req) && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setStatusChangingRequest(req)
                              setNewStatusValue('')
                              setStatusChangeNote('')
                            }}
                            title="Update Status (PATCH /api/requests/{id}/status)"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            <Clock size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty Table Notice */}
        {requests.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <AlertTriangle size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#1e293b' }}>No Requests Found</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              No service requests matched the active search or filter criteria.
            </p>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <div>
            Showing <strong>{requests.length}</strong> of <strong>{totalElements}</strong> total requests
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span>
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages || isLoading}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="login-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="login-modal"
            style={{ maxWidth: '580px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Create Service Request</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the issue or service needed"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    maxLength={200}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Category *
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(Number(e.target.value))}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Priority *
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as Priority)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Building B, Room 302"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    maxLength={150}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide full details about what is required or happening..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRequest && canEdit(editingRequest) && (
        <div className="login-modal-overlay" onClick={() => setEditingRequest(null)}>
          <div
            className="login-modal"
            style={{ maxWidth: '580px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                Edit Request: {editingRequest.referenceNumber || `#${editingRequest.id}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    maxLength={200}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Category *
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(Number(e.target.value))}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Priority *
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as Priority)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    maxLength={150}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingRequest(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL */}
      {assigningRequest && canAssign && (
        <div className="login-modal-overlay" onClick={() => setAssigningRequest(null)}>
          <div
            className="login-modal"
            style={{ maxWidth: '480px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '18px' }}>Assign Technician</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningRequest(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
              Assigning request <strong>{assigningRequest.referenceNumber}</strong> ({assigningRequest.title}) to an active technician.
            </p>

            <form onSubmit={handleAssignSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Select Technician *
                </label>
                <select
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Choose a technician...</option>
                  {technicians.length > 0 ? (
                    technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.email})
                      </option>
                    ))
                  ) : (
                    <option value="3">Tom Technician (tech@servicehub.local)</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssigningRequest(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE STATUS MODAL */}
      {statusChangingRequest && canChangeStatus(statusChangingRequest) && (
        <div className="login-modal-overlay" onClick={() => setStatusChangingRequest(null)}>
          <div
            className="login-modal"
            style={{ maxWidth: '480px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '18px' }}>Update Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusChangingRequest(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
              Current Status: <strong>{statusChangingRequest.status}</strong> for{' '}
              <strong>{statusChangingRequest.referenceNumber}</strong>.
            </p>

            <form onSubmit={handleStatusChangeSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Target Status *
                  </label>
                  <select
                    value={newStatusValue}
                    onChange={(e) => setNewStatusValue(e.target.value as RequestStatus)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Select new status...</option>
                    {statusChangingRequest.status === 'SUBMITTED' && (isAdmin || isManager) && (
                      <option value="PENDING">PENDING (Accept for review)</option>
                    )}
                    {statusChangingRequest.status === 'ASSIGNED' && (
                      <option value="IN_PROGRESS">IN_PROGRESS (Start work)</option>
                    )}
                    {statusChangingRequest.status === 'IN_PROGRESS' && (
                      <option value="RESOLVED">RESOLVED (Work completed)</option>
                    )}
                    {statusChangingRequest.status === 'RESOLVED' && (isAdmin || isManager) && (
                      <option value="CLOSED">CLOSED (Final sign-off)</option>
                    )}
                    {isAdmin && (
                      <>
                        <option value="PENDING">PENDING (Admin override)</option>
                        <option value="IN_PROGRESS">IN_PROGRESS (Admin override)</option>
                        <option value="RESOLVED">RESOLVED (Admin override)</option>
                        <option value="CLOSED">CLOSED (Admin override)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Status Transition Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explanation or progress notes for this transition..."
                    value={statusChangeNote}
                    onChange={(e) => setStatusChangeNote(e.target.value)}
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStatusChangingRequest(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS & COMMENTS SLIDE-OUT / MODAL */}
      {viewingRequest && (
        <div className="login-modal-overlay" onClick={() => setViewingRequest(null)}>
          <div
            className="login-modal"
            style={{ maxWidth: '720px', width: '92%', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '14px',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                    {viewingRequest.referenceNumber || `#${viewingRequest.id}`}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      ...getStatusBadge(viewingRequest.status),
                    }}
                  >
                    {viewingRequest.status}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      ...getPriorityBadge(viewingRequest.priority),
                    }}
                  >
                    {viewingRequest.priority}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{viewingRequest.title}</h3>
              </div>

              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Request Attributes Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '18px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} /> Requester:
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {viewingRequest.requester?.fullName || 'User'} ({viewingRequest.requester?.email || '—'})
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserCheck size={13} /> Technician:
                </span>
                <strong style={{ color: viewingRequest.assignedTo ? '#0284c7' : '#94a3b8' }}>
                  {viewingRequest.assignedTo?.fullName || 'Unassigned'}
                </strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={13} /> Category:
                </span>
                <strong style={{ color: '#0f172a' }}>{viewingRequest.category?.name || 'General'}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building size={13} /> Department:
                </span>
                <strong style={{ color: '#0f172a' }}>{viewingRequest.department?.name || '—'}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} /> Location:
                </span>
                <strong style={{ color: '#0f172a' }}>{viewingRequest.location || '—'}</strong>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> Created At:
                </span>
                <strong style={{ color: '#0f172a' }}>
                  {new Date(viewingRequest.createdAt).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', margin: '0 0 6px 0', color: '#475569' }}>Description</h4>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewingRequest.description}
              </div>
            </div>

            {/* COMMENTS SECTION */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <MessageSquare size={17} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: '15px' }}>Comments &amp; Activity ({comments.length})</h4>
              </div>

              {/* Comments List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {loadingComments ? (
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Loading comments...</p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: comment.internal ? '#fefce8' : '#f8fafc',
                        border: `1px solid ${comment.internal ? '#fef08a' : '#e2e8f0'}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                            {comment.author?.fullName || 'Staff'}
                          </strong>
                          {comment.internal && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#fef08a',
                                color: '#854d0e',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                              }}
                            >
                              <Lock size={10} /> Internal Note
                            </span>
                          )}
                        </div>

                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>
                          {new Date(comment.createdAt).toLocaleString()}
                        </small>
                      </div>

                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    No comments recorded yet.
                  </p>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment}>
                <textarea
                  rows={3}
                  placeholder="Add a comment or follow-up note..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  disabled={isPostingComment}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    marginBottom: '8px',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isStaff ? (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                      />
                      <span>Internal staff note (hidden from customer)</span>
                    </label>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    className="btn"
                    disabled={isPostingComment || !newCommentText.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
                  >
                    <Send size={14} />
                    <span>{isPostingComment ? 'Posting...' : 'Post Comment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
