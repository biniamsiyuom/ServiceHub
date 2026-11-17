import { api } from './api'

export interface DepartmentResponse {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface CreateDepartmentRequest {
  name: string
}

export interface UpdateDepartmentRequest {
  name: string
}

export interface DepartmentPageResponse {
  content: DepartmentResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ListDepartmentParams {
  search?: string
  all?: boolean
  page?: number
  size?: number
  sort?: 'id' | 'name' | 'createdAt' | 'updatedAt'
  direction?: 'asc' | 'desc'
}

/**
 * Extracts a friendly error message from backend ApiError responses
 */
export function extractErrorMessage(err: unknown, fallback = 'Operation failed'): string {
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
    return 'Permission denied: Only administrators are authorized to manage departments.'
  }

  if (axiosError?.response?.status === 409) {
    return 'Conflict: A department with this name already exists or is currently in use.'
  }

  if (axiosError?.response?.status === 404) {
    return 'The requested department was not found.'
  }

  return axiosError?.message || fallback
}

export const departmentService = {
  /**
   * GET /api/departments/all (or /api/departments?all=true)
   * Retrieves all departments as a flat list sorted by name.
   */
  async getAll(): Promise<DepartmentResponse[]> {
    try {
      const response = await api.get<DepartmentResponse[]>('/departments/all')
      return response.data
    } catch {
      // Fallback to /departments?all=true
      const fallbackResponse = await api.get<DepartmentResponse[]>('/departments', {
        params: { all: true },
      })
      return fallbackResponse.data
    }
  },

  /**
   * GET /api/departments
   * Retrieves paginated departments with optional search and sorting.
   */
  async list(params?: ListDepartmentParams): Promise<DepartmentPageResponse> {
    const response = await api.get<DepartmentPageResponse>('/departments', { params })
    return response.data
  },

  /**
   * GET /api/departments/{id}
   * Retrieves a single department by its ID.
   */
  async getById(id: number): Promise<DepartmentResponse> {
    const response = await api.get<DepartmentResponse>(`/departments/${id}`)
    return response.data
  },

  /**
   * POST /api/departments
   * Creates a new department (ADMIN only).
   */
  async create(data: CreateDepartmentRequest): Promise<DepartmentResponse> {
    const response = await api.post<DepartmentResponse>('/departments', data)
    return response.data
  },

  /**
   * PUT /api/departments/{id}
   * Updates an existing department (ADMIN only).
   */
  async update(id: number, data: UpdateDepartmentRequest): Promise<DepartmentResponse> {
    const response = await api.put<DepartmentResponse>(`/departments/${id}`, data)
    return response.data
  },

  /**
   * DELETE /api/departments/{id}
   * Deletes a department if it is not referenced by any users or requests (ADMIN only).
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/departments/${id}`)
  },
}
