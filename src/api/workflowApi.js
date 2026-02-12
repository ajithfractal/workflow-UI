import axios from 'axios'

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
    const response = await api.get('/workflow-definitions')
    return response.data
  },

  // Get workflow by ID
  getWorkflow: async (workflowId) => {
    const response = await api.get(`/workflow-definitions/${workflowId}`)
    return response.data
  },

  // Create new workflow
  createWorkflow: async (name, version, userId = 'system') => {
    const response = await api.post('/workflow-definitions', {
      name,
      version,
    }, {
      params: { createdBy: userId }
    })
    return response.data
  },

  // Add step to workflow
  addStep: async (workflowId, stepData, userId = 'system') => {
    const response = await api.post(`/workflow-definitions/${workflowId}/steps`, stepData, {
      params: { createdBy: userId }
    })
    return response.data
  },

  // Update step
  updateStep: async (stepId, stepData, userId = 'system') => {
    const response = await api.put(`/workflow-definitions/steps/${stepId}`, stepData, {
      params: { updatedBy: userId }
    })
    return response.data
  },

  // Delete step
  deleteStep: async (stepId) => {
    const response = await api.delete(`/workflow-definitions/steps/${stepId}`)
    return response.data
  },

  // Add approver to step
  addApprover: async (stepId, approverData, userId = 'system') => {
    const response = await api.post(`/workflow-definitions/steps/${stepId}/approvers`, approverData, {
      params: { createdBy: userId }
    })
    return response.data
  },

  // Remove approver
  removeApprover: async (approverId) => {
    const response = await api.delete(`/workflow-definitions/approvers/${approverId}`)
    return response.data
  },

  // Activate workflow
  activateWorkflow: async (workflowId, userId = 'system') => {
    const response = await api.post(`/workflow-definitions/${workflowId}/activate`, null, {
      params: { userId }
    })
    return response.data
  },

  // Deactivate workflow
  deactivateWorkflow: async (workflowId, userId = 'system') => {
    const response = await api.post(`/workflow-definitions/${workflowId}/deactivate`, null, {
      params: { userId }
    })
    return response.data
  },
}

export default workflowApi
