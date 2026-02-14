import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'

// Query keys
export const taskKeys = {
  all: ['tasks'],
  byApprover: (approverId) => [...taskKeys.all, 'approver', approverId],
}

// Get tasks by approver
export const useTasksByApprover = (approverId) => {
  return useQuery({
    queryKey: taskKeys.byApprover(approverId),
    queryFn: async () => {
      const data = await workflowApi.getTasksByApprover(approverId)
      // Handle different response structures
      if (Array.isArray(data)) {
        return data
      } else if (data?.data && Array.isArray(data.data)) {
        return data.data
      } else if (data?.content && Array.isArray(data.content)) {
        return data.content
      } else if (data?.tasks && Array.isArray(data.tasks)) {
        return data.tasks
      }
      return []
    },
    enabled: !!approverId && approverId.trim() !== '',
    refetchInterval: 10000, // Poll every 10 seconds
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
