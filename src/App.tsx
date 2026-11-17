import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import RequestsPage from './pages/RequestsPage'
import CategoriesPage from './pages/CategoriesPage'
import StaffPage from './pages/StaffPage'
import SettingsPage from './pages/SettingsPage'
import { requestService } from './services/requestService'
import {
  LayoutDashboard,
  ClipboardList,
  Layers,
  Users,
  Settings,
  Wrench,
  Search,
  Bell,
  Plus,
  Clock,
  CheckCircle,
  LogOut,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { logout } from './features/auth/authSlice'
import './App.css'

function App() {
const location = useLocation()
const navigate = useNavigate()
const dispatch = useAppDispatch()
const authUser = useAppSelector((state) => state.auth.user)
const isAdmin = authUser?.role === 'ADMIN'

const savedSettings = JSON.parse(
  localStorage.getItem("servicehub_settings") || "{}"
)

const displayName = authUser?.fullName || savedSettings.displayName || "User"
const displayRole = authUser?.role ? `${authUser.role} Account` : "Standard Account"

const handleLogout = () => {
  dispatch(logout())
  navigate("/login", { replace: true })
}

useEffect(() => {
  if (!isAdmin && (location.pathname === '/staff' || location.pathname === '/categories')) {
    navigate('/', { replace: true })
  }
}, [isAdmin, location.pathname, navigate])

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/requests': 'Service Requests',
  '/categories': 'Categories',
  '/staff': 'Staff',
  '/settings': 'Settings',
}

const activePage = pageNames[location.pathname] || 'Dashboard'

type DashboardRequest = {
  id: string
  name: string
  category: string
  requester: string
  status: string
  service?: string
  department?: string
  location?: string
  priority?: string
}

const [search, setSearch] = useState('')

const [showNotifications, setShowNotifications] = useState(false)

const [notifications, setNotifications] = useState(() => {
  const saved = localStorage.getItem("servicehub_notifications")
  return saved ? JSON.parse(saved) : []
})

useEffect(() => {
  const updateNotifications = () => {
    const saved = localStorage.getItem("servicehub_notifications")
    setNotifications(saved ? JSON.parse(saved) : [])
  }

  window.addEventListener(
    "servicehub_notifications_updated",
    updateNotifications
  )

  window.addEventListener("storage", updateNotifications)

  return () => {
    window.removeEventListener(
      "servicehub_notifications_updated",
      updateNotifications
    )
    window.removeEventListener("storage", updateNotifications)
  }
}, [])

const [viewingRequest, setViewingRequest] = useState<DashboardRequest | null>(null)
const [dashboardRequests, setDashboardRequests] = useState<DashboardRequest[]>(() => {
  const saved = localStorage.getItem('servicehub_requests')
  return saved ? (JSON.parse(saved) as DashboardRequest[]) : []
})

const [statusCounts, setStatusCounts] = useState<{
  total: number
  pending: number
  inProgress: number
  completed: number
}>(() => {
  const saved = localStorage.getItem('servicehub_requests')
  const initial = saved ? (JSON.parse(saved) as DashboardRequest[]) : []
  return {
    total: initial.length,
    pending: initial.filter((r) => r.status === 'PENDING').length,
    inProgress: initial.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: initial.filter((r) => r.status === 'RESOLVED' || r.status === 'COMPLETED').length,
  }
})

const totalRequests = statusCounts.total
const pendingRequests = statusCounts.pending
const inProgressRequests = statusCounts.inProgress
const completedRequests = statusCounts.completed

const chartBars = [
  { label: 'Total', value: totalRequests, tone: 'muted' },
  { label: 'Pending', value: pendingRequests, tone: 'amber' },
  { label: 'In Progress', value: inProgressRequests, tone: 'accent' },
  { label: 'Completed', value: completedRequests, tone: 'soft' },
]
const chartMax = Math.max(...chartBars.map((bar) => bar.value), 1)

const safeTotal = Math.max(totalRequests, 1)
const pendingPct = Math.round((pendingRequests / safeTotal) * 100)
const inProgressPct = Math.round((inProgressRequests / safeTotal) * 100)
const completedPct = Math.round((completedRequests / safeTotal) * 100)

const donutGradient =
  totalRequests === 0
    ? 'conic-gradient(#e9eee2 0% 100%)'
    : `conic-gradient(
        #c9a227 0% ${pendingPct}%,
        #6f8a4f ${pendingPct}% ${pendingPct + inProgressPct}%,
        #9cc456 ${pendingPct + inProgressPct}% ${pendingPct + inProgressPct + completedPct}%,
        #e9eee2 ${pendingPct + inProgressPct + completedPct}% 100%
      )`

useEffect(() => {
  let isMounted = true

  const loadCounts = async () => {
    try {
      const data = await requestService.getStatusCounts()
      if (isMounted) {
        setStatusCounts({
          total: data.totalRequests ?? data.total ?? 0,
          pending: data.pendingRequests ?? data.pending ?? 0,
          inProgress: data.inProgressRequests ?? data.inProgress ?? 0,
          completed: data.completedRequests ?? data.completed ?? 0,
        })
      }
    } catch {
      if (isMounted) {
        const saved = localStorage.getItem('servicehub_requests')
        const list = saved ? (JSON.parse(saved) as DashboardRequest[]) : []
        setStatusCounts({
          total: list.length,
          pending: list.filter((r) => r.status === 'PENDING').length,
          inProgress: list.filter((r) => r.status === 'IN_PROGRESS').length,
          completed: list.filter((r) => r.status === 'RESOLVED' || r.status === 'COMPLETED').length,
        })
      }
    }

    try {
      const res = await requestService.list({ size: 5, sort: 'createdAt', direction: 'desc' })
      if (isMounted && res.content) {
        const list: DashboardRequest[] = res.content.map((r) => ({
          id: r.referenceNumber || `SH-${r.id}`,
          name: r.title,
          service: r.title,
          category: r.category?.name || 'General',
          requester: r.requester?.fullName || 'User',
          status: r.status,
          department: r.department?.name || '',
          location: r.location || '',
          priority: r.priority,
        }))
        setDashboardRequests(list)
      }
    } catch {
      // keep fallback
    }
  }

  loadCounts()

  const updateDashboardRequests = () => {
    const saved = localStorage.getItem('servicehub_requests')
    setDashboardRequests(saved ? JSON.parse(saved) : [])
    loadCounts()
  }

  window.addEventListener('servicehub_requests_updated', updateDashboardRequests)
  window.addEventListener('storage', updateDashboardRequests)

  return () => {
    isMounted = false
    window.removeEventListener('servicehub_requests_updated', updateDashboardRequests)
    window.removeEventListener('storage', updateDashboardRequests)
  }
}, [])

  const filteredRequests = dashboardRequests.filter((request) =>
  `${request.service} ${request.category} ${request.requester} ${request.id}`
    .toLowerCase()
    .includes(search.toLowerCase())
)

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Service Requests', icon: ClipboardList },
    ...(isAdmin
      ? [
          { name: 'Categories', icon: Layers },
          { name: 'Staff', icon: Users },
        ]
      : []),
    { name: 'Settings', icon: Settings },
  ]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <Wrench size={27} />
          <span>Service</span>Hub
        </div>

        <p className="nav-title">MAIN MENU</p>

        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.name}
              className={`nav-link ${
                activePage === item.name ? 'active' : ''
              }`}
              onClick={() => {
                const paths: Record<string, string> = {
                  Dashboard: '/',
                  'Service Requests': '/requests',
                  Categories: '/categories',
                  Staff: '/staff',
                  Settings: '/settings',
                }

                navigate(paths[item.name])
              }}
            >
              <Icon size={19} />
              {item.name}
            </button>
          )
        })}

        <div className="sidebar-bottom">
          <button
            className="nav-link logout-nav-link"
            onClick={handleLogout}
            title="Sign out of ServiceHub"
          >
            <LogOut size={19} />
            Sign Out
          </button>
          <div className="sidebar-help">
            <Wrench size={23} />
            <p>{isAdmin ? 'Need help managing services?' : 'Need assistance with a request?'}</p>
            <small>{isAdmin ? 'ServiceHub Management' : 'ServiceHub Support'}</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1 className="page-title">{activePage}</h1>
            <p className="page-subtitle">
              Welcome back! Here is your service overview.
            </p>
          </div>

          <div className="topbar-actions">
            {activePage === 'Dashboard' && (
              <div className="topbar-search">
                <Search size={17} />
                <input
                  className="topbar-search-input"
                  placeholder="Search requests..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            )}
            <button
  className="notification-button"
  aria-label="Notifications"
  aria-expanded={showNotifications}
  onClick={() => setShowNotifications(!showNotifications)}
>
  <Bell size={20} />
</button>
            <div className="profile">
              <div className="profile-avatar">
  {displayName.charAt(0).toUpperCase()}
</div>
              <div>
                <strong>{displayName}</strong>
                <small>{displayRole}</small>
              </div>
            </div>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>
        {showNotifications && (
  <div className="notifications-panel">
    <h3>Notifications</h3>

    {notifications.length === 0 ? (
      <p>You have no notifications.</p>
    ) : (
      notifications.map((notification: {
        id: number
        message: string
        date: string
        read: boolean
      }) => (
        <div key={notification.id}>
          <p>{notification.message}</p>
          <small>
            {new Date(notification.date).toLocaleString()}
          </small>
        </div>
      ))
    )}

    <button
      className="btn"
      onClick={() => setShowNotifications(false)}
    >
      Close
    </button>
  </div>
)}
        {activePage === 'Dashboard' && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">
                  <ClipboardList size={23} />
                </div>
                <p className="stat-label">Total Requests</p>
                <div className="stat-value">{totalRequests}</div>
                <small>All service requests</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">
                  <Clock size={23} />
                </div>
                <p className="stat-label">Pending Requests</p>
                <div className="stat-value">{pendingRequests}</div>
                <small>Waiting for action</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">
                  <Wrench size={23} />
                </div>
                <p className="stat-label">In Progress</p>
                <div className="stat-value">{inProgressRequests}</div>
                <small>Currently being handled</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <CheckCircle size={23} />
                </div>
                <p className="stat-label">Completed</p>
                <div className="stat-value">{completedRequests}</div>
                <small>Successfully completed</small>
              </div>
            </section>

            <section className="dashboard-panels">
              <div className="content-card chart-card">
                <div className="card-heading">
                  <div>
                    <h2 className="section-title">Request activity</h2>
                    <p className="page-subtitle">
                      Current workload across every service request.
                    </p>
                  </div>
                  <span className="soft-chip">Live</span>
                </div>

                <div className="bar-chart">
                  {chartBars.map((bar) => (
                    <div className="bar-column" key={bar.label}>
                      <span className="bar-value">{bar.value}</span>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${bar.tone}`}
                          style={{
                            height: `${Math.max((bar.value / chartMax) * 100, 5)}%`,
                          }}
                        />
                      </div>
                      <span className="bar-label">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="content-card overview-card">
                <div className="card-heading">
                  <div>
                    <h2 className="section-title">Service overview</h2>
                    <p className="page-subtitle">Share of requests by status.</p>
                  </div>
                </div>

                <div className="overview-body">
                  <div className="donut" style={{ background: donutGradient }}>
                    <div className="donut-center">
                      <strong>{totalRequests}</strong>
                      <span>Total</span>
                    </div>
                  </div>

                  <ul className="legend">
                    <li>
                      <span className="legend-dot pending" />
                      <span>Pending</span>
                      <strong>{pendingRequests}</strong>
                    </li>
                    <li>
                      <span className="legend-dot progress" />
                      <span>In progress</span>
                      <strong>{inProgressRequests}</strong>
                    </li>
                    <li>
                      <span className="legend-dot completed" />
                      <span>Completed</span>
                      <strong>{completedRequests}</strong>
                    </li>
                    <li>
                      <span className="legend-dot other" />
                      <span>Other</span>
                      <strong>{Math.max(totalRequests - pendingRequests - inProgressRequests - completedRequests, 0)}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="content-card">
              <div className="section-heading">
                <div>
                  <h2 className="section-title">Recent Service Requests</h2>
                  <p className="page-subtitle">
                    View and track the latest requests.
                  </p>
                </div>

                <button
  className="btn"
  onClick={() => navigate('/requests')}
>
  <Plus size={17} /> New Request
</button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Service</th>
                      <th>Category</th>
                      <th>Requester</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.id}</td>
                        <td>{request.service}</td>
                        <td>{request.category}</td>
                        <td>{request.requester}</td>
                        <td>
                          <span
  className={`status ${
    request.status === "IN_PROGRESS"
      ? "in-progress"
      : request.status === "RESOLVED"
        ? "completed"
        : "pending"
  }`}
>
  {request.status === "IN_PROGRESS"
    ? "In Progress"
    : request.status === "RESOLVED"
      ? "Completed"
      : request.status === "PENDING"
        ? "Pending"
        : request.status}
</span>                        </td>
                        <td>
                          <button
  className="btn"
  onClick={() => setViewingRequest(request)}
>
  View Details
</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredRequests.length === 0 && (
                  <p className="empty-message">No matching requests found.</p>
                )}
              </div>
            </section>
          </>
        )}
      {viewingRequest && (
       <div
  className="details-overlay"
  tabIndex={-1}
  autoFocus
  onKeyDown={(event) => {
    if (event.key === "Escape") {
      setViewingRequest(null)
    }
  }}
  onClick={() => setViewingRequest(null)}
>
          <div
            className="details-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Service Request Details</h2>

            <p><strong>Request ID:</strong> {viewingRequest.id}</p>
            <p><strong>Service:</strong> {viewingRequest.service}</p>
            <p><strong>Category:</strong> {viewingRequest.category}</p>
            <p><strong>Requester:</strong> {viewingRequest.requester}</p>
            <p><strong>Department:</strong> {viewingRequest.department || "Not specified"}</p>
            <p><strong>Location:</strong> {viewingRequest.location || "Not specified"}</p>
            <p><strong>Priority:</strong> {viewingRequest.priority || "Not specified"}</p>
            <p>
              <strong>Status:</strong>{" "}
              {viewingRequest.status === "IN_PROGRESS"
                ? "In Progress"
                : viewingRequest.status === "RESOLVED"
                  ? "Completed"
                  : viewingRequest.status === "PENDING"
                    ? "Pending"
                    : viewingRequest.status}
            </p>

            <button
              className="btn"
              onClick={() => setViewingRequest(null)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
        {activePage === 'Service Requests' && <RequestsPage />}

        {activePage === 'Categories' && <CategoriesPage />}

        {activePage === 'Staff' && <StaffPage />}

       {activePage === 'Settings' && <SettingsPage />}
      </main>
    </div>
  )
}

export default App
