import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type UserRole =
  | 'ADMIN'
  | 'EMPLOYEE'
  | 'TECHNICIAN'
  | 'MANAGER'

export interface User {
  id: number
  fullName: string
  email: string
  role: UserRole
  departmentId?: number
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

const getStoredAuth = (): { user: User; token: string } | null => {
  try {
    const raw = localStorage.getItem('servicehub_auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.user && parsed?.token) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Failed to parse stored auth session:', err)
  }
  return null
}

const storedAuth = getStoredAuth()

const initialState: AuthState = {
  user: storedAuth?.user || null,
  token: storedAuth?.token || null,
  isAuthenticated: Boolean(storedAuth?.token),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{ user: User; token: string }>,
    ) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true

      try {
        localStorage.setItem(
          'servicehub_auth',
          JSON.stringify({
            user: action.payload.user,
            token: action.payload.token,
          }),
        )
      } catch (err) {
        console.error('Failed to save auth to localStorage:', err)
      }
    },

    updateUserProfile: (
      state,
      action: PayloadAction<Partial<User>>,
    ) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        try {
          localStorage.setItem(
            'servicehub_auth',
            JSON.stringify({
              user: state.user,
              token: state.token,
            }),
          )
        } catch (err) {
          console.error('Failed to update auth in localStorage:', err)
        }
      }
    },

    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false

      try {
        localStorage.removeItem('servicehub_auth')
      } catch (err) {
        console.error('Failed to remove auth from localStorage:', err)
      }
    },
  },
})

export const { loginSuccess, updateUserProfile, logout } = authSlice.actions

export default authSlice.reducer
