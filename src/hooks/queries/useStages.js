import { useMutation, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'
import { mapStageToBackend } from '../../utils/workflowMapper'
import { workflowKeys } from './useWorkflows'

// Create stage mutation
export const useCreateStage = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workflowId, stageData, userId = 'system' }) => {
      const backendStageData = mapStageToBackend(stageData)
      return await workflowApi.createStage(workflowId, backendStageData, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate workflow to refetch with new stage
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
    },
  })
}

// Update stage mutation
export const useUpdateStage = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ stageId, workflowId, stageData, userId = 'system' }) => {
      const backendStageData = mapStageToBackend(stageData)
      return await workflowApi.updateStage(stageId, backendStageData, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate workflow to refetch updated stage
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}

// Delete stage mutation
export const useDeleteStage = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ stageId, workflowId }) => {
      return await workflowApi.deleteStage(stageId)
    },
    onSuccess: (_, variables) => {
      // Invalidate workflow to refetch without deleted stage
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      }
    },
  })
}
