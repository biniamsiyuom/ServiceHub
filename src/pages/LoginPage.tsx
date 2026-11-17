import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Wrench,
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
          tokenType: response.tokenType,
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

      <div className="login-shell">
        {/* Left welcome panel */}
        <aside className="login-showcase">
          <div className="showcase-orb showcase-orb-1" />
          <div className="showcase-orb showcase-orb-2" />

          <div className="login-brand login-brand-light">
            <div className="login-brand-icon">
              <Wrench size={26} />
            </div>
            <span>Service</span>Hub
          </div>

          <div className="showcase-body">
            <h1 className="showcase-title">Welcome to ServiceHub.</h1>
            <p className="showcase-copy">
              Your service desk, in one calm and secure place.
            </p>
          </div>
        </aside>

        {/* Right sign-in panel */}
        <main className="login-panel">
          <div className="login-header">
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">
              Sign in to manage requests, services, and operations.
            </p>
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
                Email
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  id="email-input"
                  className="login-input"
                  type="email"
                  placeholder="you@servicehub.local"
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
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </main>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="login-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <KeyRound size={22} color="#60a5fa" />
              <h3>Reset your password</h3>
            </div>
            <p>
              Password resets for the administrator portal must be initiated
              through your system administrator.
            </p>
            <button
              type="button"
              className="btn"
              style={{ width: '100%' }}
              onClick={() => setShowForgotModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
