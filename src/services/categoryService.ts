import { api } from './api'

export interface CategoryResponse {
  id: number
  name: string
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  active?: boolean
}

export interface UpdateCategoryRequest {
  name: string
  description?: string
  active?: boolean
}

export interface PatchCategoryRequest {
  name?: string
  description?: string
  active?: boolean
}

export interface CategoryPageResponse {
  content: CategoryResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ListCategoryParams {
  search?: string
  active?: boolean
  all?: boolean
  page?: number
  size?: number
  sort?: 'id' | 'name' | 'active' | 'createdAt' | 'updatedAt'
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
    return 'Permission denied: Only administrators are authorized to manage categories.'
  }

  if (axiosError?.response?.status === 409) {
    return 'Conflict: A category with this name already exists or is currently in use.'
  }

  if (axiosError?.response?.status === 404) {
    return 'The requested category was not found.'
  }

  return axiosError?.message || fallback
}

export const categoryService = {
  /**
   * GET /api/categories/all (or /api/categories?all=true)
   * Retrieves all categories as a flat list, optionally filtered by active state.
   */
  async getAll(active?: boolean): Promise<CategoryResponse[]> {
    const params = active !== undefined ? { active } : {}
    try {
      const response = await api.get<CategoryResponse[]>('/categories/all', { params })
      return response.data
    } catch {
      // Fallback to /categories?all=true
      const fallbackResponse = await api.get<CategoryResponse[]>('/categories', {
        params: { ...params, all: true },
      })
      return fallbackResponse.data
    }
  },

  /**
   * GET /api/categories
   * Retrieves paginated categories with optional search, active filter, and sorting.
   */
  async list(params?: ListCategoryParams): Promise<CategoryPageResponse> {
    const response = await api.get<CategoryPageResponse>('/categories', { params })
    return response.data
  },

  /**
   * GET /api/categories/{id}
   * Retrieves a single category by its ID.
   */
  async getById(id: number): Promise<CategoryResponse> {
    const response = await api.get<CategoryResponse>(`/categories/${id}`)
    return response.data
  },

  /**
   * POST /api/categories
   * Creates a new service category (ADMIN only).
   */
  async create(data: CreateCategoryRequest): Promise<CategoryResponse> {
    const response = await api.post<CategoryResponse>('/categories', data)
    return response.data
  },

  /**
   * PUT /api/categories/{id}
   * Completely updates an existing service category (ADMIN only).
   */
  async update(id: number, data: UpdateCategoryRequest): Promise<CategoryResponse> {
    const response = await api.put<CategoryResponse>(`/categories/${id}`, data)
    return response.data
  },

  /**
   * PATCH /api/categories/{id}
   * Partially updates a category, e.g. toggling active status or renaming (ADMIN only).
   */
  async patch(id: number, data: PatchCategoryRequest): Promise<CategoryResponse> {
    const response = await api.patch<CategoryResponse>(`/categories/${id}`, data)
    return response.data
  },

  /**
   * DELETE /api/categories/{id}
   * Deletes a category if not currently referenced by any service request (ADMIN only).
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/categories/${id}`)
  },
}
