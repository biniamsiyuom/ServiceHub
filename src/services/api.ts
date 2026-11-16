import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Bearer token from localStorage to outgoing requests
api.interceptors.request.use((config) => {
  try {
    const rawAuth = localStorage.getItem('servicehub_auth')
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth)
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`
      }
    }
  } catch (error) {
    console.error('Failed to attach auth token to request:', error)
  }
  return config
})

// Handle unauthorized responses (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('servicehub_auth')
      // If we are not already on login, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
