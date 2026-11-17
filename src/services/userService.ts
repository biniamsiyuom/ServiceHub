import { api } from './api'

export interface DepartmentSummary {
  id: number
  name: string
}

export interface UserProfileResponse {
  id: number
  email: string
  fullName: string
  phone: string | null
  role: string
  department: DepartmentSummary | null
  active: boolean
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ListUsersParams {
  search?: string
  role?: string
  departmentId?: number
  active?: boolean
  page?: number
  size?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface CreateStaffRequest {
  email: string
  password: string
  fullName: string
  phone?: string
  departmentId?: number
}

export interface UpdateProfileRequest {
  fullName?: string
  phone?: string | null
}

export const FALLBACK_STAFF: UserProfileResponse[] = [
  {
    id: 1,
    email: 'admin@servicehub.local',
    fullName: 'System Administrator',
    phone: '+10000000001',
    role: 'ADMIN',
    department: { id: 1, name: 'Information Technology' },
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
  {
    id: 2,
    email: 'manager@servicehub.local',
    fullName: 'Mia Manager',
    phone: '+10000000002',
    role: 'MANAGER',
    department: { id: 1, name: 'Information Technology' },
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
  },
  {
    id: 3,
    email: 'tech@servicehub.local',
    fullName: 'Tom Technician',
    phone: '+10000000003',
    role: 'TECHNICIAN',
    department: { id: 1, name: 'Information Technology' },
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
  {
    id: 4,
    email: 'employee@servicehub.local',
    fullName: 'Eve Employee',
    phone: '+10000000004',
    role: 'EMPLOYEE',
    department: { id: 1, name: 'Information Technology' },
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
]

export function extractUserErrorMessage(err: unknown, fallback = 'Operation failed'): string {
  const axiosError = err as {
    response?: {
      status?: number
      data?: {
        message?: string
        error?: string
        fieldErrors?: Record<string, string>
      }
    }
    message?: string
  }

  if (axiosError?.response?.data) {
    const data = axiosError.response.data
    if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
      return Object.values(data.fieldErrors).join(', ')
    }
    if (data.message) {
      return data.message
    }
    if (data.error) {
      return data.error
    }
  }

  if (axiosError?.response?.status === 403) {
    return 'Permission denied: Viewing the users directory requires Administrator privileges.'
  }

  if (axiosError?.response?.status === 409) {
    return 'Conflict: A user with this email address already exists.'
  }

  return axiosError?.message || fallback
}

export const userService = {
  /**
   * GET /api/users
   * Lists users with optional pagination, search, role, and active status filters.
   * Requires ADMIN role.
   */
  async list(params?: ListUsersParams): Promise<PageResponse<UserProfileResponse>> {
    const response = await api.get<PageResponse<UserProfileResponse>>('/users', {
      params,
    })
    return response.data
  },

  /**
   * GET /api/users/me
   * Fetches profile of currently authenticated user.
   */
  async getMe(): Promise<UserProfileResponse> {
    const response = await api.get<UserProfileResponse>('/users/me')
    return response.data
  },

  /**
   * PATCH /api/users/me
   * Updates the authenticated user's own profile (full name and phone).
   */
  async updateMe(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    const response = await api.patch<UserProfileResponse>('/users/me', data)
    return response.data
  },

  /**
   * POST /api/auth/register
   * Registers a new user account.
   */
  async register(data: CreateStaffRequest): Promise<{ id: number; email: string; fullName: string; role: string }> {
    const response = await api.post<{ id: number; email: string; fullName: string; role: string }>('/auth/register', data)
    return response.data
  },
}
