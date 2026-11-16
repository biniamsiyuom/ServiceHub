import { api } from './api'
import type { User, UserRole } from '../features/auth/authSlice'

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

/**
 * Matches backend `com.servicehub.dto.auth.LoginResponse`
 */
export interface BackendLoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: {
    id: number
    email: string
    fullName: string
    role: UserRole
    departmentId?: number | null
  }
}

/**
 * Matches backend `com.servicehub.dto.common.ApiError`
 */
export interface BackendApiError {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  path?: string
  fieldErrors?: Record<string, string>
}

export interface AuthResponse {
  user: User
  token: string
  tokenType?: string
  expiresIn?: number
}

// Built-in demo accounts aligned with backend seed data (V10__seed_demo_data.sql)
const OFFLINE_DEMO_ACCOUNTS: Record<
  string,
  { password: string; user: User }
> = {
  'admin@servicehub.local': {
    password: 'Password123!',
    user: {
      id: 1,
      fullName: 'System Administrator',
      email: 'admin@servicehub.local',
      role: 'ADMIN',
      departmentId: 1,
    },
  },
  'admin@servicehub.com': {
    password: 'admin123',
    user: {
      id: 1,
      fullName: 'System Administrator',
      email: 'admin@servicehub.com',
      role: 'ADMIN',
      departmentId: 1,
    },
  },
  'manager@servicehub.local': {
    password: 'Password123!',
    user: {
      id: 2,
      fullName: 'Mia Manager',
      email: 'manager@servicehub.local',
      role: 'MANAGER',
      departmentId: 1,
    },
  },
  'tech@servicehub.local': {
    password: 'Password123!',
    user: {
      id: 3,
      fullName: 'Tom Technician',
      email: 'tech@servicehub.local',
      role: 'TECHNICIAN',
      departmentId: 1,
    },
  },
  'employee@servicehub.local': {
    password: 'Password123!',
    user: {
      id: 4,
      fullName: 'Eve Employee',
      email: 'employee@servicehub.local',
      role: 'EMPLOYEE',
      departmentId: 1,
    },
  },
}

export const authService = {
  /**
   * Calls the ServiceHub backend login endpoint: POST /api/auth/login
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password, remember } = credentials
    const cleanEmail = email.trim()

    // Remember or clear email from local storage
    if (remember) {
      localStorage.setItem('servicehub_remembered_email', cleanEmail)
    } else {
      localStorage.removeItem('servicehub_remembered_email')
    }

    try {
      // Call backend login endpoint
      const response = await api.post<BackendLoginResponse>('/auth/login', {
        email: cleanEmail,
        password,
      })

      const data = response.data
      const token = data.accessToken || (data as unknown as { token?: string }).token

      if (!token) {
        throw new Error('Authentication succeeded but server returned no access token.')
      }

      return {
        user: {
          id: data.user.id,
          fullName: data.user.fullName,
          email: data.user.email,
          role: data.user.role,
          departmentId: data.user.departmentId ?? null,
        },
        token,
        tokenType: data.tokenType || 'Bearer',
        expiresIn: data.expiresIn,
      }
    } catch (err: unknown) {
      const axiosError = err as {
        isAxiosError?: boolean
        response?: {
          status: number
          statusText?: string
          data?: BackendApiError
        }
        message?: string
      }

      // If backend responded with an HTTP error status code
      if (axiosError.response) {
        const errorData = axiosError.response.data

        // 1. Validation errors (400 Bad Request with fieldErrors)
        if (errorData?.fieldErrors && Object.keys(errorData.fieldErrors).length > 0) {
          const fieldMessages = Object.entries(errorData.fieldErrors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ')
          throw new Error(fieldMessages || 'Validation failed. Please check your input.')
        }

        // 2. Specific API error message from backend
        if (errorData?.message) {
          throw new Error(errorData.message)
        }

        // 3. Fallback messages by HTTP status code
        if (axiosError.response.status === 401) {
          throw new Error('Invalid email or password. Please verify your credentials.')
        }
        if (axiosError.response.status === 403) {
          throw new Error('Access denied. Your account is disabled or unauthorized.')
        }
        if (axiosError.response.status === 404) {
          throw new Error('Authentication endpoint not found on the server.')
        }

        throw new Error(
          `Authentication request failed with status ${axiosError.response.status}.`,
        )
      }

      // If backend is offline / unreachable (e.g. Network Error, ECONNREFUSED)
      const normalizedEmail = cleanEmail.toLowerCase()
      const demoAccount = OFFLINE_DEMO_ACCOUNTS[normalizedEmail]

      if (demoAccount && demoAccount.password === password) {
        console.warn(
          'Backend servicehub is unreachable. Logging in using offline demo credentials.',
        )
        return {
          user: demoAccount.user,
          token: `demo-jwt-token-${demoAccount.user.role.toLowerCase()}-${Date.now()}`,
          tokenType: 'Bearer',
          expiresIn: 3600,
        }
      }

      // If network error and didn't match offline demo credentials
      if (axiosError.message === 'Network Error' || !axiosError.response) {
        throw new Error(
          'Unable to reach ServiceHub backend at ' +
            (api.defaults.baseURL || 'http://localhost:8080/api') +
            '. Please verify the backend service is running.',
        )
      }

      throw new Error(axiosError.message || 'Authentication failed. Please try again.')
    }
  },

  /**
   * Retrieves the profile of the currently authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/users/me')
    return response.data
  },

  /**
   * Clears saved authentication session
   */
  logout(): void {
    localStorage.removeItem('servicehub_auth')
  },

  /**
   * Retrieves remembered email address if previously saved
   */
  getRememberedEmail(): string {
    return localStorage.getItem('servicehub_remembered_email') || ''
  },
}
