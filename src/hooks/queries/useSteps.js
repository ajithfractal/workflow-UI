import { useMutation, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'
import { mapStepToBackend } from '../../utils/workflowMapper'
import { workflowKeys } from './useWorkflows'

// Add step mutation (now requires stageId instead of workflowId)
export const useAddStep = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ stageId, workflowId, stepData, userId = 'system' }) => {
      const backendStepData = mapStepToBackend(stepData)
      return await workflowApi.addStep(stageId, backendStepData, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate workflow to refetch with new step
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}

// Update step mutation
export const useUpdateStep = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ stepId, stepData, workflowId, userId = 'system' }) => {
      const backendStepData = mapStepToBackend(stepData)
      // Always use the step update endpoint: /workflow-definitions/steps/{stepId}
      return await workflowApi.updateStep(stepId, backendStepData, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate workflow to refetch updated step
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}

// Delete step mutation
export const useDeleteStep = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ stepId, workflowId }) => {
      return await workflowApi.deleteStep(stepId)
    },
    onSuccess: (_, variables) => {
      // Invalidate workflow to refetch without deleted step
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}
