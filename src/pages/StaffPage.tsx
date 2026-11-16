import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  RotateCw,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Wrench,
  Briefcase,
  User,
  Mail,
  Phone,
  Building,
  Eye,
  ChevronLeft,
  ChevronRight,
  Lock,
  Info,
} from 'lucide-react'
import {
  userService,
  extractUserErrorMessage,
  FALLBACK_STAFF,
  type UserProfileResponse,
  type ListUsersParams,
} from '../services/userService'
import { useAppSelector } from '../store/hooks'

const DEPARTMENTS = [
  { id: 1, name: 'Information Technology' },
  { id: 2, name: 'Facilities' },
  { id: 3, name: 'Operations' },
]

const AVATAR_COLORS = [
  { bg: '#e0e7ff', text: '#3730a3' }, // Indigo
  { bg: '#dbeafe', text: '#1e40af' }, // Blue
  { bg: '#dcfce7', text: '#166534' }, // Green
  { bg: '#fef3c7', text: '#92400e' }, // Amber
  { bg: '#fce7f3', text: '#9d174d' }, // Pink
  { bg: '#ede9fe', text: '#5b21b6' }, // Purple
]

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getRoleBadge(role: string) {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return {
        label: 'Administrator',
        bg: '#ede9fe',
        color: '#6d28d9',
        border: '#ddd6fe',
        icon: Shield,
      }
    case 'MANAGER':
      return {
        label: 'Manager',
        bg: '#e0f2fe',
        color: '#0369a1',
        border: '#bae6fd',
        icon: Briefcase,
      }
    case 'TECHNICIAN':
      return {
        label: 'Technician',
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fde68a',
        icon: Wrench,
      }
    case 'EMPLOYEE':
    default:
      return {
        label: 'Employee',
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1',
        icon: User,
      }
  }
}

export default function StaffPage() {
  const navigate = useNavigate()
  const authUser = useAppSelector((state) => state.auth.user)
  const isAdmin = authUser?.role === 'ADMIN'

  // Users data state
  const [users, setUsers] = useState<UserProfileResponse[]>(FALLBACK_STAFF)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Pagination & Filtering
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(FALLBACK_STAFF.length)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewingUser, setViewingUser] = useState<UserProfileResponse | null>(null)

  // Add User Form States
  const [formFullName, setFormFullName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formDepartmentId, setFormDepartmentId] = useState<number | ''>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Fetch Users Callback (GET /api/users)
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (!isAdmin) {
        // Non-admin can view own profile via GET /api/users/me
        try {
          const profile = await userService.getMe()
          setUsers([profile])
          setTotalElements(1)
          setTotalPages(1)
        } catch {
          setUsers(FALLBACK_STAFF)
        }
        return
      }

      const params: ListUsersParams = {
        search: search.trim() || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
        page,
        size: pageSize,
        sort: sortField,
        direction: sortDirection,
      }

      const response = await userService.list(params)
      setUsers(response.content)
      setTotalPages(response.totalPages)
      setTotalElements(response.totalElements)
      localStorage.setItem('servicehub_staff_users', JSON.stringify(response.content))
    } catch (err: unknown) {
      const msg = extractUserErrorMessage(err, 'Failed to fetch users from server.')
      setErrorMessage(msg)

      const cached = localStorage.getItem('servicehub_staff_users')
      if (cached) {
        try {
          setUsers(JSON.parse(cached))
        } catch {
          setUsers(FALLBACK_STAFF)
        }
      } else {
        setUsers(FALLBACK_STAFF)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin, search, roleFilter, activeFilter, sortField, sortDirection, page, pageSize])

  // Synchronize user list on filter / pagination change
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        if (!isAdmin) {
          try {
            const profile = await userService.getMe()
            if (isMounted) {
              setUsers([profile])
              setTotalElements(1)
              setTotalPages(1)
            }
          } catch {
            if (isMounted) {
              setUsers(FALLBACK_STAFF)
            }
          }
          return
        }

        const params: ListUsersParams = {
          search: search.trim() || undefined,
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
          active: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
          page,
          size: pageSize,
          sort: sortField,
          direction: sortDirection,
        }

        const response = await userService.list(params)
        if (!isMounted) return
        setUsers(response.content)
        setTotalPages(response.totalPages)
        setTotalElements(response.totalElements)
        localStorage.setItem('servicehub_staff_users', JSON.stringify(response.content))
      } catch (err: unknown) {
        if (!isMounted) return
        console.warn('Backend users endpoint unreachable:', err)
        const cached = localStorage.getItem('servicehub_staff_users')
        if (cached) {
          try {
            setUsers(JSON.parse(cached))
          } catch {
            setUsers(FALLBACK_STAFF)
          }
        } else {
          setUsers(FALLBACK_STAFF)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [isAdmin, search, roleFilter, activeFilter, sortField, sortDirection, page, pageSize])

  // Handle Add Staff / User
  const handleOpenAdd = () => {
    setFormFullName('')
    setFormEmail('')
    setFormPassword('')
    setFormPhone('')
    setFormDepartmentId(1)
    setFormError(null)
    setShowAddModal(true)
  }

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formFullName.trim()) {
      setFormError('Full name is required.')
      return
    }

    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('A valid email address is required.')
      return
    }

    if (!formPassword || formPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.')
      return
    }

    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formPassword)) {
      setFormError('Password must contain at least one letter and one number.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await userService.register({
        fullName: formFullName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        phone: formPhone.trim() || undefined,
        departmentId: formDepartmentId === '' ? undefined : Number(formDepartmentId),
      })

      setShowAddModal(false)
      setSuccessMessage(`User "${result.fullName}" (${result.email}) was registered successfully!`)
      fetchUsers()
    } catch (err: unknown) {
      const msg = extractUserErrorMessage(err, 'Failed to register user.')
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary Metrics
  const adminCount = users.filter((u) => u.role === 'ADMIN').length
  const managerCount = users.filter((u) => u.role === 'MANAGER').length
  const techCount = users.filter((u) => u.role === 'TECHNICIAN').length
  const employeeCount = users.filter((u) => u.role === 'EMPLOYEE').length
  const activeCount = users.filter((u) => u.active).length

  if (!isAdmin) {
    return (
      <div className="staff-page">
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
            The Staff Management directory contains personnel administrative tools and user records restricted to <strong>Administrator</strong> accounts. You are currently signed in as <strong>{authUser?.fullName || 'User'}</strong> ({authUser?.role || 'Standard Account'}).
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
    <div className="staff-page">
      <section className="content-card">
        {/* Header */}
        <div className="section-heading">
          <div>
            <h2 className="section-title">Staff Management</h2>
            <p className="page-subtitle">
              User directory and role management integrated with ServiceHub backend endpoints.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchUsers}
              disabled={isLoading}
              title="Refresh staff directory"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCw size={15} className={isLoading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className="btn"
                onClick={handleOpenAdd}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={17} />
                <span>Add Staff</span>
              </button>
            )}
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

        {/* Non-Admin Notice */}
        {!isAdmin && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '18px',
              fontSize: '13px',
            }}
          >
            <Info size={18} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <strong>Limited Access Notice:</strong> The full user directory (<code>GET /api/users</code>) is restricted to <strong>ADMIN</strong> roles in accordance with backend security policies. Log in with an administrator account (e.g. <code>admin@servicehub.local</code>) for full staff management.
            </div>
          </div>
        )}

        {/* Overview Metric Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Directory Users
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              {totalElements}
            </div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
              ● {activeCount} active status
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Technicians
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>
              {techCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Available for assignment
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Leadership &amp; Admins
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#6d28d9', marginTop: '4px' }}>
              {adminCount + managerCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {adminCount} Admins · {managerCount} Managers
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Employees
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
              {employeeCount}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              General service users
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
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
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
            />
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
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
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Administrators</option>
              <option value="MANAGER">Managers</option>
              <option value="TECHNICIAN">Technicians</option>
              <option value="EMPLOYEE">Employees</option>
            </select>
          </div>

          {/* Active Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Status:</label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
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
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Sort:</label>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-')
                setSortField(f)
                setSortDirection(d as 'asc' | 'desc')
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
              <option value="id-asc">ID (Ascending)</option>
              <option value="fullName-asc">Name (A-Z)</option>
              <option value="email-asc">Email (A-Z)</option>
              <option value="createdAt-desc">Newest First</option>
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User / Name</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((member) => {
                const rBadge = getRoleBadge(member.role)
                const RoleIcon = rBadge.icon
                const avatarColor = getAvatarColor(member.id)

                return (
                  <tr key={member.id}>
                    {/* User / Name with Avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: avatarColor.bg,
                            color: avatarColor.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(member.fullName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{member.fullName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>ID #{member.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: '#334155',
                        }}
                      >
                        <Mail size={14} color="#64748b" />
                        <span>{member.email}</span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: member.phone ? '#334155' : '#94a3b8',
                        }}
                      >
                        <Phone size={14} color="#64748b" />
                        <span>{member.phone || '—'}</span>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: rBadge.bg,
                          color: rBadge.color,
                          border: `1px solid ${rBadge.border}`,
                          padding: '4px 9px',
                          borderRadius: '14px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        <RoleIcon size={13} />
                        <span>{rBadge.label}</span>
                      </span>
                    </td>

                    {/* Department */}
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: '#334155',
                        }}
                      >
                        <Building size={14} color="#64748b" />
                        <span>{member.department?.name || 'Unassigned'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: member.active ? '#dcfce7' : '#f1f5f9',
                          color: member.active ? '#15803d' : '#64748b',
                          border: `1px solid ${member.active ? '#86efac' : '#cbd5e1'}`,
                        }}
                      >
                        {member.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(member.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setViewingUser(member)}
                        title="View user profile"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Users size={36} color="#94a3b8" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>No staff members found</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                Try adjusting your search criteria or role filters.
              </div>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid #e2e8f0',
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            <div>
              Showing page {page + 1} of {totalPages} ({totalElements} users)
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: page === 0 ? '#f1f5f9' : '#ffffff',
                  color: page === 0 ? '#94a3b8' : '#334155',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: page >= totalPages - 1 ? '#f1f5f9' : '#ffffff',
                  color: page >= totalPages - 1 ? '#94a3b8' : '#334155',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* View User Profile Modal */}
      {viewingUser && (
        <div className="details-overlay" onClick={() => setViewingUser(null)}>
          <div
            className="details-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Staff Profile</h2>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                marginBottom: '18px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: getAvatarColor(viewingUser.id).bg,
                  color: getAvatarColor(viewingUser.id).text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(viewingUser.fullName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {viewingUser.fullName}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {viewingUser.email}
                </div>
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: viewingUser.active ? '#dcfce7' : '#f1f5f9',
                    color: viewingUser.active ? '#15803d' : '#64748b',
                    border: `1px solid ${viewingUser.active ? '#86efac' : '#cbd5e1'}`,
                  }}
                >
                  {viewingUser.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Details Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 500 }}>System ID:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>#{viewingUser.id}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 500 }}>Assigned Role:</span>
                {(() => {
                  const b = getRoleBadge(viewingUser.role)
                  const Icon = b.icon
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: b.bg,
                        color: b.color,
                        border: `1px solid ${b.border}`,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Icon size={12} />
                      <span>{b.label}</span>
                    </span>
                  )
                })()}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 500 }}>Department:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {viewingUser.department?.name || 'Unassigned'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 500 }}>Phone Number:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {viewingUser.phone || 'None recorded'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 500 }}>Account Created:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {new Date(viewingUser.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Staff / User Modal */}
      {showAddModal && (
        <div className="details-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="details-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Add New Staff Member</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Registers a new staff member into the ServiceHub database via <code>POST /api/auth/register</code>.
            </p>

            {formError && (
              <div
                role="alert"
                style={{
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterStaff}>
              {/* Full Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. alex@servicehub.local"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Temporary Password */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Password * (min 8 chars, 1 letter, 1 number)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    placeholder="e.g. Password123!"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                  <Lock
                    size={16}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: '12px', top: '12px' }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +10000000005"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Department */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Department
                </label>
                <select
                  value={formDepartmentId}
                  onChange={(e) =>
                    setFormDepartmentId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#ffffff',
                  }}
                >
                  <option value="">Unassigned</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
