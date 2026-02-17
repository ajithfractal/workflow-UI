import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'
import { workflowKeys } from './useWorkflows'

// Query keys for rules
export const ruleKeys = {
  all: ['rules'],
  lists: () => [...ruleKeys.all, 'list'],
  list: (stepDefinitionId) => [...ruleKeys.lists(), stepDefinitionId],
}

// List rules for a step
export const useStepRules = (stepDefinitionId) => {
  return useQuery({
    queryKey: ruleKeys.list(stepDefinitionId),
    queryFn: async () => {
      if (!stepDefinitionId) return []
      const response = await workflowApi.listStepRules(stepDefinitionId)
      // Handle different response structures
      if (Array.isArray(response)) {
        return response
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data
      } else if (response?.rules && Array.isArray(response.rules)) {
        return response.rules
      }
      return []
    },
    enabled: !!stepDefinitionId,
  })
}

// Create rule mutation
export const useCreateStepRule = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ stepDefinitionId, ruleData, workflowId, userId = 'system' }) => {
      return await workflowApi.createStepRule(stepDefinitionId, ruleData, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate rules list for the step
      queryClient.invalidateQueries({ queryKey: ruleKeys.list(variables.stepDefinitionId) })
      // Invalidate workflow to refetch with updated rules
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}

// Update rule mutation
export const useUpdateStepRule = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ ruleId, ruleData, stepDefinitionId, workflowId, userId = 'system' }) => {
      return await workflowApi.updateStepRule(ruleId, ruleData, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate rules list for the step
      if (variables.stepDefinitionId) {
        queryClient.invalidateQueries({ queryKey: ruleKeys.list(variables.stepDefinitionId) })
      }
      // Invalidate workflow
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}

// Delete rule mutation
export const useDeleteStepRule = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ ruleId, stepDefinitionId, workflowId }) => {
      return await workflowApi.deleteStepRule(ruleId)
    },
    onSuccess: (_, variables) => {
      // Invalidate rules list for the step
      if (variables.stepDefinitionId) {
        queryClient.invalidateQueries({ queryKey: ruleKeys.list(variables.stepDefinitionId) })
      }
      // Invalidate workflow
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}
