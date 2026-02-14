import axios from 'axios'
import {
  WORKFLOW_ENDPOINTS,
  STEP_ENDPOINTS,
  APPROVER_ENDPOINTS,
  WORK_ITEM_ENDPOINTS,
  WORKFLOW_EXECUTION_ENDPOINTS,
  QUERY_PARAMS,
} from '../constants/apiEndpoints'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Workflow CRUD operations
export const workflowApi = {
  // List all workflows
  listWorkflows: async () => {
    const response = await api.get(WORKFLOW_ENDPOINTS.LIST)
    return response.data
  },

  // Get workflow by ID
  getWorkflow: async (workflowId) => {
    const response = await api.get(WORKFLOW_ENDPOINTS.GET(workflowId))
    return response.data
  },

  // Create new workflow
  createWorkflow: async (name, version, userId = 'system') => {
    const response = await api.post(
      WORKFLOW_ENDPOINTS.CREATE,
      { name, version },
      { params: { [QUERY_PARAMS.CREATED_BY]: userId } }
    )
    return response.data
  },

  // Add step to workflow
  addStep: async (workflowId, stepData, userId = 'system') => {
    const response = await api.post(
      STEP_ENDPOINTS.CREATE(workflowId),
      stepData,
      { params: { [QUERY_PARAMS.CREATED_BY]: userId } }
    )
    return response.data
  },

  // Update step
  updateStep: async (stepId, stepData, userId = 'system') => {
    const response = await api.put(
      STEP_ENDPOINTS.UPDATE(stepId),
      stepData,
      { params: { [QUERY_PARAMS.UPDATED_BY]: userId } }
    )
    return response.data
  },

  // Delete step
  deleteStep: async (stepId) => {
    const response = await api.delete(STEP_ENDPOINTS.DELETE(stepId))
    return response.data
  },

  // Add approvers to step (accepts array of approvers)
  addApprovers: async (stepId, approversArray, userId = 'system') => {
    // Ensure it's always an array
    const approvers = Array.isArray(approversArray) ? approversArray : [approversArray]
    const response = await api.post(
      APPROVER_ENDPOINTS.ADD(stepId),
      approvers,
      { params: { [QUERY_PARAMS.CREATED_BY]: userId } }
    )
    return response.data
  },

  // Remove approver
  removeApprover: async (approverId) => {
    const response = await api.delete(APPROVER_ENDPOINTS.REMOVE(approverId))
    return response.data
  },

  // Activate workflow
  activateWorkflow: async (workflowId, userId = 'system') => {
    const response = await api.post(
      WORKFLOW_ENDPOINTS.ACTIVATE(workflowId),
      null,
      { params: { [QUERY_PARAMS.USER_ID]: userId } }
    )
    return response.data
  },

  // Deactivate workflow
  deactivateWorkflow: async (workflowId, userId = 'system') => {
    const response = await api.post(
      WORKFLOW_ENDPOINTS.DEACTIVATE(workflowId),
      null,
      { params: { [QUERY_PARAMS.USER_ID]: userId } }
    )
    return response.data
  },

  // ========== Work Item APIs ==========
  
  // List all work items with optional filters
  listWorkItems: async (workflowDefinitionId = null, filters = {}) => {
    // Use the by-workflow endpoint if workflowDefinitionId is provided
    const endpoint = workflowDefinitionId 
      ? WORK_ITEM_ENDPOINTS.LIST_BY_WORKFLOW(workflowDefinitionId)
      : WORK_ITEM_ENDPOINTS.LIST
    
    // Build query parameters from filters (only if not using by-workflow endpoint)
    const params = {}
    if (!workflowDefinitionId) {
      // Only add filters when listing all work items
      if (filters.status) {
        params.status = filters.status
      }
      if (filters.type) {
        params.type = filters.type
      }
    }
    
    const response = await api.get(endpoint, { params })
    return response.data
  },

  // Get work item by ID
  getWorkItem: async (workItemId) => {
    const response = await api.get(WORK_ITEM_ENDPOINTS.GET(workItemId))
    return response.data
  },

  // Create work item
  createWorkItem: async (workItemData, userId = 'system') => {
    const response = await api.post(
      WORK_ITEM_ENDPOINTS.CREATE,
      workItemData,
      { params: { [QUERY_PARAMS.CREATED_BY]: userId } }
    )
    return response.data
  },

  // Submit work item (requires request body)
  submitWorkItem: async (workItemId, submitRequest = {}, userId = 'system') => {
    const response = await api.post(
      WORK_ITEM_ENDPOINTS.SUBMIT(workItemId),
      submitRequest,
      { params: { [QUERY_PARAMS.SUBMITTED_BY]: userId } }
    )
    return response.data
  },

  // Get workflow progress
  getWorkflowProgress: async (workItemId) => {
    const response = await api.get(WORK_ITEM_ENDPOINTS.PROGRESS(workItemId))
    return response.data
  },

  // Get work item versions
  getWorkItemVersions: async (workItemId) => {
    const response = await api.get(WORK_ITEM_ENDPOINTS.VERSIONS(workItemId))
    return response.data
  },

  // Archive work item
  archiveWorkItem: async (workItemId, userId = 'system') => {
    const response = await api.post(
      WORK_ITEM_ENDPOINTS.ARCHIVE(workItemId),
      null,
      { params: { [QUERY_PARAMS.USER_ID]: userId } }
    )
    return response.data
  },

  // Get work item types
  getWorkItemTypes: async () => {
    try {
      // Try dedicated endpoint first
      const response = await api.get(WORK_ITEM_ENDPOINTS.TYPES)
      // If response is an array, return it; otherwise check for data property
      if (Array.isArray(response.data)) {
        return response.data
      } else if (response.data?.types && Array.isArray(response.data.types)) {
        return response.data.types
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data
      }
      return []
    } catch (error) {
      // If dedicated endpoint doesn't exist, fetch all work items and extract unique types
      try {
        const workItemsResponse = await api.get(WORK_ITEM_ENDPOINTS.LIST)
        // Handle different response structures (same as listWorkItems)
        let workItems = []
        if (Array.isArray(workItemsResponse.data)) {
          workItems = workItemsResponse.data
        } else if (workItemsResponse.data?.data && Array.isArray(workItemsResponse.data.data)) {
          workItems = workItemsResponse.data.data
        } else if (workItemsResponse.data?.content && Array.isArray(workItemsResponse.data.content)) {
          workItems = workItemsResponse.data.content
        }
        
        // Extract unique types from work items
        const uniqueTypes = [...new Set(workItems.map(item => item?.type).filter(Boolean))]
        return uniqueTypes.sort()
      } catch (fallbackError) {
        console.error('Failed to fetch work item types:', fallbackError)
        return []
      }
    }
  },

  // Start workflow execution
  startWorkflow: async (workItemId, workflowDefId, userId = 'system') => {
    // Build query string manually to ensure parameters are sent correctly
    const params = new URLSearchParams()
    params.append('workItemId', String(workItemId))
    params.append('workflowDefId', String(workflowDefId))
    params.append('userId', String(userId))
    
    const url = `${WORKFLOW_EXECUTION_ENDPOINTS.START}?${params.toString()}`
    
    const response = await api.post(url, {})
    return response.data
  },
}

export default workflowApi
