import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'
import { mapWorkflowToUI } from '../../utils/workflowMapper'

// Query keys
export const workflowKeys = {
  all: ['workflows'],
  lists: () => [...workflowKeys.all, 'list'],
  list: (filters) => [...workflowKeys.lists(), { filters }],
  details: () => [...workflowKeys.all, 'detail'],
  detail: (id) => [...workflowKeys.details(), id],
}

// Get all workflows
export const useWorkflows = () => {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: async () => {
      const data = await workflowApi.listWorkflows()
      // Handle different response structures
      if (Array.isArray(data)) {
        return data.map(mapWorkflowToUI)
      } else if (data?.data && Array.isArray(data.data)) {
        return data.data.map(mapWorkflowToUI)
      } else if (data?.workflows && Array.isArray(data.workflows)) {
        return data.workflows.map(mapWorkflowToUI)
      } else if (data?.content && Array.isArray(data.content)) {
        return data.content.map(mapWorkflowToUI)
      }
      return []
    },
  })
}

// Get single workflow
export const useWorkflow = (workflowId) => {
  // Ensure workflowId is a string, not an object
  const id = typeof workflowId === 'string' ? workflowId : workflowId?.workflowId || workflowId?.id || null
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: async () => {
      const backendWorkflow = await workflowApi.getWorkflow(id)
      return mapWorkflowToUI(backendWorkflow)
    },
    enabled: !!id && typeof id === 'string',
  })
}

// Create workflow mutation
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, version, userId = 'system', visualStructure = null }) => {
      return await workflowApi.createWorkflow(name, version, userId, visualStructure)
    },
    onSuccess: (response) => {
      // Invalidate workflows list
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
      // Extract the actual workflow ID from the response
      const newId = typeof response === 'string'
        ? response
        : response?.workflowId || response?.id || null
      // Optionally prefetch the new workflow
      if (newId) {
        queryClient.prefetchQuery({
          queryKey: workflowKeys.detail(newId),
          queryFn: async () => {
            const backendWorkflow = await workflowApi.getWorkflow(newId)
            return mapWorkflowToUI(backendWorkflow)
          },
        })
      }
    },
  })
}

// Update workflow mutation
export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workflowId, updateData, userId = 'system' }) => {
      return await workflowApi.updateWorkflow(workflowId, updateData, userId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    },
  })
}

// Update workflow visual structure mutation
export const useUpdateWorkflowVisualStructure = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workflowId, visualStructure, name, version, userId = 'system' }) => {
      return await workflowApi.updateWorkflowVisualStructure(workflowId, visualStructure, name, version, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate workflow detail to refresh with new visual structure
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
    },
  })
}

// Delete workflow mutation
export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workflowId }) => {
      return await workflowApi.deleteWorkflow(workflowId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    },
  })
}

// Activate workflow mutation
export const useActivateWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workflowId, userId = 'system' }) => {
      return await workflowApi.activateWorkflow(workflowId, userId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    },
  })
}

// Deactivate workflow mutation
export const useDeactivateWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workflowId, userId = 'system' }) => {
      return await workflowApi.deactivateWorkflow(workflowId, userId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    },
  })
}
