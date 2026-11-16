import React, { useCallback, useEffect, useState } from 'react'
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Wrench,
  Briefcase,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Hash,
} from 'lucide-react'
import {
  userService,
  extractUserErrorMessage,
  type UserProfileResponse,
} from '../services/userService'
import { useAppSelector } from '../store/hooks'

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

function getRoleBadge(role?: string) {
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

export default function SettingsPage() {
  const authUser = useAppSelector((state) => state.auth.user)

  // Profile data from GET /api/users/me
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Fetch logged in user profile from GET /api/users/me on mount
  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      try {
        const profile = await userService.getMe()
        if (!isMounted) return
        setUserProfile(profile)

        // Sync local storage display settings with verified profile
        try {
          const currentSettings = JSON.parse(
            localStorage.getItem('servicehub_settings') || '{}',
          )
          localStorage.setItem(
            'servicehub_settings',
            JSON.stringify({
              ...currentSettings,
              displayName: profile.fullName,
              email: profile.email,
              department: profile.department?.name || 'Information Technology',
            }),
          )
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        if (!isMounted) return
        console.warn('Unable to reach /api/users/me, using auth user fallback:', err)

        // Fallback to authUser from Redux if available
        if (authUser) {
          setUserProfile({
            id: authUser.id,
            email: authUser.email,
            fullName: authUser.fullName,
            phone: null,
            role: authUser.role,
            department: authUser.departmentId
              ? { id: authUser.departmentId, name: 'Information Technology' }
              : null,
            active: true,
            createdAt: new Date().toISOString(),
          })
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [authUser])

  // Manual refresh callback
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setErrorMessage(null)

    try {
      const profile = await userService.getMe()
      setUserProfile(profile)
      try {
        const currentSettings = JSON.parse(
          localStorage.getItem('servicehub_settings') || '{}',
        )
        localStorage.setItem(
          'servicehub_settings',
          JSON.stringify({
            ...currentSettings,
            displayName: profile.fullName,
            email: profile.email,
            department: profile.department?.name || 'Information Technology',
          }),
        )
      } catch {
        // ignore
      }
      setSuccessMessage('Profile details successfully reloaded from /api/users/me!')
    } catch (err: unknown) {
      setErrorMessage(
        extractUserErrorMessage(err, 'Failed to fetch user profile from /api/users/me.'),
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const roleBadge = getRoleBadge(userProfile?.role || authUser?.role)
  const RoleIcon = roleBadge.icon
  const avatarColors = getAvatarColor(userProfile?.id || authUser?.id || 1)

  return (
    <div className="settings-page">
      <section className="content-card">
        {/* Page Heading */}
        <div className="section-heading">
          <div>
            <h2 className="section-title">Settings &amp; Profile</h2>
            <p className="page-subtitle">
              View your authenticated user account details and credentials retrieved directly from the ServiceHub API.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Reload profile from /api/users/me"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCw size={15} className={isRefreshing ? 'spinner' : ''} />
            <span>Refresh Profile</span>
          </button>
        </div>

        {/* Success Banner */}
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
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            <CheckCircle2 size={18} color="#059669" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Banner */}
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
              marginBottom: '20px',
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

        {/* Logged In User Profile Card (via GET /api/users/me) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              paddingBottom: '20px',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            {/* User Identity / Avatar Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: avatarColors.bg,
                  color: avatarColors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                  flexShrink: 0,
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                }}
              >
                {getInitials(userProfile?.fullName || authUser?.fullName || 'User')}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 700 }}>
                    {userProfile?.fullName || authUser?.fullName || 'Authenticated User'}
                  </h3>

                  {/* Active Status Badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: userProfile?.active ?? true ? '#dcfce7' : '#f1f5f9',
                      color: userProfile?.active ?? true ? '#15803d' : '#64748b',
                      border: `1px solid ${userProfile?.active ?? true ? '#86efac' : '#cbd5e1'}`,
                    }}
                  >
                    ● {userProfile?.active ?? true ? 'Active Account' : 'Inactive'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#64748b',
                    marginTop: '4px',
                  }}
                >
                  <Mail size={14} />
                  <span>{userProfile?.email || authUser?.email || '—'}</span>
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: roleBadge.bg,
                  color: roleBadge.color,
                  border: `1px solid ${roleBadge.border}`,
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <RoleIcon size={15} />
                <span>{roleBadge.label}</span>
              </span>
            </div>
          </div>

          {/* Profile Attributes Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {/* User ID */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                <Hash size={13} />
                <span>User ID</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                #{userProfile?.id || authUser?.id || '—'}
              </div>
            </div>

            {/* Department */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                <Building size={13} />
                <span>Department</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                {userProfile?.department?.name || 'Information Technology'}
              </div>
            </div>

            {/* Phone */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                <Phone size={13} />
                <span>Phone Number</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                {userProfile?.phone || 'Not recorded'}
              </div>
            </div>

            {/* Account Created Date */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                <Calendar size={13} />
                <span>Member Since</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                {userProfile?.createdAt
                  ? new Date(userProfile.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Active session'}
              </div>
            </div>
          </div>

          {/* Backend Sync Note */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Shield size={14} color="#64748b" />
            <span>
              Profile data is authenticated and fetched from <code>GET /api/users/me</code>. Role and department permissions are managed by system administrators.
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
