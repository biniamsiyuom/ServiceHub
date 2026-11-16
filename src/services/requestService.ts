import { api } from './api'

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

export const requestService = {
  /**
   * Fetches request status statistics from the backend endpoint:
   * GET /api/requests/status-counts (with fallback to /api/dashboard/status-counts)
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
      // Try dashboard alias if requests/status-counts fails
      const response = await api.get<RequestStatusCounts>('/dashboard/status-counts', {
        params,
      })
      return response.data
    }
  },
}
