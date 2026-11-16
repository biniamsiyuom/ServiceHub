import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Wrench,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react'
import { useAppDispatch } from '../store/hooks'
import { loginSuccess } from '../features/auth/authSlice'
import { authService } from '../services/authService'
import './LoginPage.css'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // Retrieve destination path if redirected from a protected route
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const [email, setEmail] = useState(() => authService.getRememberedEmail())
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => Boolean(authService.getRememberedEmail()))
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showForgotModal, setShowForgotModal] = useState(false)

  const handleFillDemo = () => {
    setEmail('admin@servicehub.com')
    setPassword('admin123')
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    setIsLoading(true)

    try {
      const response = await authService.login({
        email: email.trim(),
        password,
        remember,
      })

      // Dispatch login success to Redux (which also syncs to localStorage)
      dispatch(
        loginSuccess({
          user: response.user,
          token: response.token,
        }),
      )

      // Sync display name if user has one
      if (response.user.fullName) {
        try {
          const currentSettings = JSON.parse(
            localStorage.getItem('servicehub_settings') || '{}',
          )
          localStorage.setItem(
            'servicehub_settings',
            JSON.stringify({
              ...currentSettings,
              displayName: response.user.fullName,
              email: response.user.email,
            }),
          )
        } catch {
          // ignore
        }
      }

      // Redirect to the originally requested page or dashboard
      navigate(from, { replace: true })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Authentication failed. Please verify your credentials.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Background ambient lighting */}
      <div className="login-bg-decor login-bg-decor-1" />
      <div className="login-bg-decor login-bg-decor-2" />

      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-brand">
            <div className="login-brand-icon">
              <Wrench size={26} />
            </div>
            <span>Service</span>Hub
          </div>

          <div>
            <span className="admin-badge">
              <ShieldCheck size={14} /> Admin Portal
            </span>
          </div>

          <h1 className="login-title">Sign In to Dashboard</h1>
          <p className="login-subtitle">
            Welcome back! Please enter your administrator credentials to manage requests, services, and operations.
          </p>
        </div>

        {/* Demo Credentials Quick Fill Banner */}
        <div className="demo-credentials-box">
          <div className="demo-credentials-header">
            <span>Demo Administrator Access</span>
            <button
              type="button"
              className="demo-fill-btn"
              onClick={handleFillDemo}
            >
              Auto-fill Demo
            </button>
          </div>
          <div className="demo-credentials-info">
            <div>Email: <strong>admin@servicehub.com</strong></div>
            <div>Password: <strong>admin123</strong></div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-alert" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="email-input">
              Admin Email
            </label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Mail size={18} />
              </span>
              <input
                id="email-input"
                className="login-input"
                type="email"
                placeholder="admin@servicehub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password-input">
              Password
            </label>
            <div className="input-wrapper">
              <span className="input-icon-left">
                <Lock size={18} />
              </span>
              <input
                id="password-input"
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-label">
              <input
                type="checkbox"
                className="remember-checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLoading}
              />
              Remember my email
            </label>

            <button
              type="button"
              className="forgot-password-link"
              onClick={() => setShowForgotModal(true)}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Security Notice Footer */}
        <div className="login-footer">
          <div className="security-badge">
            <ShieldCheck size={15} />
            <span>Secure Admin Portal &bull; Protected Access Only</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="login-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <KeyRound size={22} color="#60a5fa" />
              <h3>Password Reset Notice</h3>
            </div>
            <p>
              As this is an enterprise administrator portal, credential resets must be initiated through your system administrator or by using the demo credentials provided above:
            </p>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '18px', fontSize: '13px', color: '#93c5fd' }}>
              <div>Demo Admin: <strong>admin@servicehub.com</strong></div>
              <div>Demo Password: <strong>admin123</strong></div>
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: '100%' }}
              onClick={() => {
                handleFillDemo()
                setShowForgotModal(false)
              }}
            >
              Auto-fill Demo &amp; Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
