import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'
import { workflowKeys } from './useWorkflows'

// Query keys
export const workItemKeys = {
  all: ['workItems'],
  lists: () => [...workItemKeys.all, 'list'],
  list: (filters) => [...workItemKeys.lists(), { filters }],
  details: () => [...workItemKeys.all, 'detail'],
  detail: (id) => [...workItemKeys.details(), id],
  progress: (id) => [...workItemKeys.detail(id), 'progress'],
}

// Get all work items or work items for a specific workflow
// filters: { status?: string, type?: string }
export const useWorkItems = (workflowDefinitionId = null, filters = {}) => {
  return useQuery({
    queryKey: workItemKeys.list({ workflowDefinitionId, ...filters }),
    queryFn: async () => {
      const data = await workflowApi.listWorkItems(workflowDefinitionId, filters)
      // Handle different response structures
      if (Array.isArray(data)) {
        return data
      } else if (data?.data && Array.isArray(data.data)) {
        return data.data
      } else if (data?.content && Array.isArray(data.content)) {
        return data.content
      }
      return []
    },
  })
}

// Get single work item
export const useWorkItem = (workItemId) => {
  return useQuery({
    queryKey: workItemKeys.detail(workItemId),
    queryFn: async () => {
      return await workflowApi.getWorkItem(workItemId)
    },
    enabled: !!workItemId,
  })
}

// Get workflow progress
export const useWorkflowProgress = (workItemId, { polling = false } = {}) => {
  return useQuery({
    queryKey: workItemKeys.progress(workItemId),
    queryFn: async () => {
      return await workflowApi.getWorkflowProgress(workItemId)
    },
    enabled: !!workItemId,
    // Only poll when explicitly requested (e.g. workflow is IN_PROGRESS)
    // Increased interval to 60 seconds to reduce API calls
    refetchInterval: (query) => {
      // Only poll if polling is enabled AND workflow is still IN_PROGRESS
      if (!polling) return false
      const data = query.state.data
      const status = data?.workflowInstance?.status
      // Stop polling if workflow is not IN_PROGRESS
      return status === 'IN_PROGRESS' ? 60000 : false
    },
    // Prevent unnecessary refetches
    refetchOnMount: false, // Never refetch on mount, only use polling interval
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Cache the data longer to prevent rapid refetches
    staleTime: polling ? 50000 : 10 * 60 * 1000, // 50 seconds when polling (less than interval), 10 minutes when not
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

// Create work item mutation
export const useCreateWorkItem = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workItemData, userId = 'system' }) => {
      return await workflowApi.createWorkItem(workItemData, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workItemKeys.lists() })
    },
  })
}

// Submit work item mutation
export const useSubmitWorkItem = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workItemId, submitRequest = {}, userId = 'system' }) => {
      return await workflowApi.submitWorkItem(workItemId, submitRequest, userId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workItemKeys.detail(variables.workItemId) })
      queryClient.invalidateQueries({ queryKey: workItemKeys.progress(variables.workItemId) })
      queryClient.invalidateQueries({ queryKey: workItemKeys.lists() })
    },
  })
}

// Create and submit work item in one call
export const useCreateAndSubmitWorkItem = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ submitData, userId = 'system' }) => {
      return await workflowApi.createAndSubmitWorkItem(submitData, userId)
    },
    onSuccess: (data) => {
      // Invalidate all work item lists
      queryClient.invalidateQueries({ queryKey: workItemKeys.lists() })
      // If response contains workItemId, invalidate that specific item
      const workItemId = data?.workItemId || data?.id
      if (workItemId) {
        queryClient.invalidateQueries({ queryKey: workItemKeys.detail(workItemId) })
        queryClient.invalidateQueries({ queryKey: workItemKeys.progress(workItemId) })
      }
    },
  })
}

// Get work item types
export const useWorkItemTypes = () => {
  return useQuery({
    queryKey: [...workItemKeys.all, 'types'],
    queryFn: async () => {
      return await workflowApi.getWorkItemTypes()
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

// Start workflow mutation
export const useStartWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workItemId, workflowDefId, userId = 'system' }) => {
      return await workflowApi.startWorkflow(workItemId, workflowDefId, userId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workItemKeys.detail(variables.workItemId) })
      queryClient.invalidateQueries({ queryKey: workItemKeys.progress(variables.workItemId) })
      queryClient.invalidateQueries({ queryKey: workItemKeys.lists() })
    },
  })
}
