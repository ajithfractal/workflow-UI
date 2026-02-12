import { useMutation, useQueryClient } from '@tanstack/react-query'
import workflowApi from '../../api/workflowApi'
import { workflowKeys } from './useWorkflows'

// Add approvers mutation (batch)
export const useAddApprovers = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ stepId, approversArray, workflowId, userId = 'system' }) => {
      // Ensure it's always an array
      const approvers = Array.isArray(approversArray) ? approversArray : [approversArray]
      return await workflowApi.addApprovers(stepId, approvers, userId)
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific workflow if workflowId is provided
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      } else {
        // Fallback: invalidate all workflows
        queryClient.invalidateQueries({ queryKey: workflowKeys.all })
      }
    },
  })
}

// Remove approver mutation
export const useRemoveApprover = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ approverId, workflowId }) => {
      return await workflowApi.removeApprover(approverId)
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific workflow if workflowId is provided
      if (variables.workflowId) {
        queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) })
      } else {
        // Fallback: invalidate all workflows
        queryClient.invalidateQueries({ queryKey: workflowKeys.all })
      }
    },
  })
}
