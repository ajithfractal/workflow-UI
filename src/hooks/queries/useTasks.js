import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'

// Query keys
export const taskKeys = {
  all: ['tasks'],
  search: (filters) => [...taskKeys.all, 'search', filters],
}

/**
 * Search tasks with pagination and filters.
 *
 * @param {Object} params
 * @param {string}  params.approverId  - Required approver ID
 * @param {number}  params.page        - Page number (0-based)
 * @param {number}  params.size        - Page size
 * @param {string}  [params.status]    - Filter by status (PENDING, APPROVED, REJECTED)
 * @param {string}  [params.search]    - Free text search
 * @param {number}  [params.startTime] - Epoch millis start
 * @param {number}  [params.endTime]   - Epoch millis end
 * @param {string}  [params.timeCheckIn] - Which date field to filter on (dueAt / createdAt)
 * @param {boolean} [params.enabled]   - Override query enabled flag
 */
export const useSearchTasks = ({
  approverId,
  page = 0,
  size = 10,
  status,
  search,
  startTime,
  endTime,
  timeCheckIn,
  enabled,
} = {}) => {
  const filters = { approverId, page, size, status, search, startTime, endTime, timeCheckIn }

  return useQuery({
    queryKey: taskKeys.search(filters),
    queryFn: () => workflowApi.searchTasks(filters),
    enabled: enabled !== undefined ? enabled : (!!approverId && approverId.trim() !== ''),
    refetchInterval: 15000, // Poll every 15 seconds
    keepPreviousData: true, // Keep old page data while loading next page
  })
}

// Approve task mutation
export const useApproveTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, comment = '', userId = 'system' }) => {
      return await workflowApi.approveTask(taskId, comment, userId)
    },
    onSuccess: () => {
      // Invalidate all task queries to refresh the list
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

// Reject task mutation
export const useRejectTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, comment = '', userId = 'system' }) => {
      return await workflowApi.rejectTask(taskId, comment, userId)
    },
    onSuccess: () => {
      // Invalidate all task queries to refresh the list
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
