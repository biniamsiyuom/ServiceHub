import { api } from './api'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RequestStatus =
  | 'SUBMITTED'
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'

export interface LookupItem {
  id: number
  name: string
}

export interface RequestUserSummary {
  id: number
  email: string
  fullName: string
}

export interface ServiceRequestResponse {
  id: number
  referenceNumber: string
  title: string
  description: string
  category: LookupItem
  priority: Priority
  status: RequestStatus
  location: string | null
  requester: RequestUserSummary
  department: LookupItem | null
  assignedTo: RequestUserSummary | null
  resolvedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRequestRequest {
  title: string
  description: string
  categoryId: number
  priority?: Priority
  departmentId?: number
  location?: string
}

export interface UpdateRequestRequest {
  title: string
  description: string
  categoryId: number
  priority?: Priority
  location?: string
}

export interface UpdateRequestStatusRequest {
  status: RequestStatus
  note?: string
}

export interface AssignTechnicianRequest {
  technicianId: number
}

export interface CreateCommentRequest {
  content: string
  internal?: boolean
}

export interface RequestCommentResponse {
  id: number
  requestId: number
  content: string
  internal: boolean
  author: RequestUserSummary
  createdAt: string
  updatedAt: string
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

export interface ListRequestsParams {
  search?: string
  status?: string
  priority?: string
  categoryId?: number
  departmentId?: number
  assignedToId?: number
  page?: number
  size?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface RequestStatusCountItem {
  status: string
  count: number
}

export interface RequestStatusCounts {
  totalRequests: number
  pendingRequests: number
  inProgressRequests: number
  completedRequests: number
  submittedRequests?: number
  assignedRequests?: number
  resolvedRequests?: number
  closedRequests?: number
  total?: number
  pending?: number
  inProgress?: number
  completed?: number
  requestsByStatus?: Record<string, number>
  byStatus?: Record<string, number>
  statusCounts?: RequestStatusCountItem[]
}

/**
 * Extracts friendly error message from backend ApiError responses
 */
export function extractRequestErrorMessage(err: unknown, fallback = 'Request failed'): string {
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
    return 'Permission denied: You are not authorized to perform this operation.'
  }

  if (axiosError?.response?.status === 409) {
    return 'Conflict: Operation conflicts with the current request state.'
  }

  if (axiosError?.response?.status === 404) {
    return 'The requested resource was not found.'
  }

  return axiosError?.message || fallback
}

export const requestService = {
  /**
   * GET /api/requests
   * Fetches paginated service requests with optional filters
   */
  async list(params?: ListRequestsParams): Promise<PageResponse<ServiceRequestResponse>> {
    const response = await api.get<PageResponse<ServiceRequestResponse>>('/requests', {
      params,
    })
    return response.data
  },

  /**
   * GET /api/requests/{id}
   * Fetches details of a single service request
   */
  async getById(id: number): Promise<ServiceRequestResponse> {
    const response = await api.get<ServiceRequestResponse>(`/requests/${id}`)
    return response.data
  },

  /**
   * POST /api/requests
   * Creates a new service request
   */
  async create(data: CreateRequestRequest): Promise<ServiceRequestResponse> {
    const response = await api.post<ServiceRequestResponse>('/requests', data)
    return response.data
  },

  /**
   * PUT /api/requests/{id}
   * Updates an existing service request
   */
  async update(id: number, data: UpdateRequestRequest): Promise<ServiceRequestResponse> {
    const response = await api.put<ServiceRequestResponse>(`/requests/${id}`, data)
    return response.data
  },

  /**
   * PATCH /api/requests/{id}/status
   * Updates request status with transition validation (ADMIN, MANAGER, TECHNICIAN)
   */
  async changeStatus(id: number, data: UpdateRequestStatusRequest): Promise<ServiceRequestResponse> {
    const response = await api.patch<ServiceRequestResponse>(`/requests/${id}/status`, data)
    return response.data
  },

  /**
   * PATCH /api/technician/tasks/{id}/status
   * Dedicated endpoint for technicians to update the status of requests assigned to them.
   * Supports updating status to IN_PROGRESS and COMPLETED / RESOLVED.
   */
  async updateTechnicianTaskStatus(
    id: number,
    data: { status: RequestStatus | 'COMPLETED' | 'completed' | 'inprogress'; note?: string },
  ): Promise<ServiceRequestResponse> {
    try {
      const response = await api.patch<ServiceRequestResponse>(`/technician/tasks/${id}/status`, data)
      return response.data
    } catch {
      // Fallback to aliases /tasks/{id}/status or /requests/{id}/status
      try {
        const aliasResponse = await api.patch<ServiceRequestResponse>(`/tasks/${id}/status`, data)
        return aliasResponse.data
      } catch {
        const fallbackResponse = await api.patch<ServiceRequestResponse>(`/requests/${id}/status`, data)
        return fallbackResponse.data
      }
    }
  },

  /**
   * GET /api/technician/tasks
   * Retrieves assigned tasks specifically for the authenticated technician.
   */
  async listTechnicianTasks(params?: ListRequestsParams): Promise<PageResponse<ServiceRequestResponse>> {
    const response = await api.get<PageResponse<ServiceRequestResponse>>('/technician/tasks', {
      params,
    })
    return response.data
  },

  /**
   * PATCH /api/requests/{id}/assign
   * Assigns a technician to a request (ADMIN, MANAGER)
   */
  async assignTechnician(id: number, data: AssignTechnicianRequest): Promise<ServiceRequestResponse> {
    const response = await api.patch<ServiceRequestResponse>(`/requests/${id}/assign`, data)
    return response.data
  },

  /**
   * GET /api/requests/{id}/comments
   * Retrieves comments for a service request
   */
  async listComments(id: number, page = 0, size = 50): Promise<PageResponse<RequestCommentResponse>> {
    const response = await api.get<PageResponse<RequestCommentResponse>>(`/requests/${id}/comments`, {
      params: { page, size },
    })
    return response.data
  },

  /**
   * POST /api/requests/{id}/comments
   * Adds a new comment or internal note to a request
   */
  async addComment(id: number, data: CreateCommentRequest): Promise<RequestCommentResponse> {
    const response = await api.post<RequestCommentResponse>(`/requests/${id}/comments`, data)
    return response.data
  },

  /**
   * GET /api/requests/status-counts
   * Retrieves status counts for dashboard state cards
   */
  async getStatusCounts(params?: {
    dateFrom?: string
    dateTo?: string
    departmentId?: number
    priority?: string
  }): Promise<RequestStatusCounts> {
    try {
      const response = await api.get<RequestStatusCounts>('/requests/status-counts', {
        params,
      })
      return response.data
    } catch {
      const response = await api.get<RequestStatusCounts>('/dashboard/status-counts', {
        params,
      })
      return response.data
    }
  },

  /**
   * GET /api/users?role=TECHNICIAN
   * Retrieves list of available technicians for assignment
   */
  async getTechnicians(): Promise<RequestUserSummary[]> {
    try {
      const response = await api.get<PageResponse<{ id: number; email: string; fullName: string }>>(
        '/users',
        { params: { role: 'TECHNICIAN', size: 100 } },
      )
      return response.data.content || []
    } catch {
      return []
    }
  },
}
