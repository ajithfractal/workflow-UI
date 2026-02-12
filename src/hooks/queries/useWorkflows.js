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
  return useQuery({
    queryKey: workflowKeys.detail(workflowId),
    queryFn: async () => {
      const backendWorkflow = await workflowApi.getWorkflow(workflowId)
      return mapWorkflowToUI(backendWorkflow)
    },
    enabled: !!workflowId,
  })
}

// Create workflow mutation
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, version, userId = 'system' }) => {
      return await workflowApi.createWorkflow(name, version, userId)
    },
    onSuccess: (workflowId) => {
      // Invalidate workflows list
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
      // Optionally prefetch the new workflow
      if (workflowId) {
        queryClient.prefetchQuery({
          queryKey: workflowKeys.detail(workflowId),
          queryFn: async () => {
            const backendWorkflow = await workflowApi.getWorkflow(workflowId)
            return mapWorkflowToUI(backendWorkflow)
          },
        })
      }
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
