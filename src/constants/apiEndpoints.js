/**
 * Centralized API endpoint constants
 * All API endpoints should be defined here for easy maintenance
 * 
 * Note: API_BASE is set to empty string because axios instance in workflowApi.js
 * already has baseURL set to '/api'. Endpoints here should start with '/' to be
 * combined with the baseURL correctly.
 */

const API_BASE = ''

// Workflow Definition endpoints
export const WORKFLOW_ENDPOINTS = {
  LIST: `${API_BASE}/workflow-definitions`,
  GET: (id) => `${API_BASE}/workflow-definitions/${id}`,
  CREATE: `${API_BASE}/workflow-definitions`,
  UPDATE: (id) => `${API_BASE}/workflow-definitions/${id}`,
  DELETE: (id) => `${API_BASE}/workflow-definitions/${id}`,
  ACTIVATE: (id) => `${API_BASE}/workflow-definitions/${id}/activate`,
  DEACTIVATE: (id) => `${API_BASE}/workflow-definitions/${id}/deactivate`,
}

// Workflow Stage endpoints
export const STAGE_ENDPOINTS = {
  CREATE: (workflowId) => `${API_BASE}/workflow-definitions/${workflowId}/stages`,
  UPDATE: (stageId) => `${API_BASE}/workflow-definitions/stages/${stageId}`,
  DELETE: (stageId) => `${API_BASE}/workflow-definitions/stages/${stageId}`,
}

// Workflow Step endpoints
export const STEP_ENDPOINTS = {
  CREATE: (stageId) => `${API_BASE}/workflow-definitions/stages/${stageId}/steps`,
  UPDATE: (stepId) => `${API_BASE}/workflow-definitions/steps/${stepId}`,
  UPDATE_DEFINITION: (workflowId, stepId) => `${API_BASE}/workflow-definitions/${workflowId}/steps/${stepId}`,
  DELETE: (stepId) => `${API_BASE}/workflow-definitions/steps/${stepId}`,
}

// Approver endpoints
export const APPROVER_ENDPOINTS = {
  ADD: (stepId) => `${API_BASE}/workflow-definitions/steps/${stepId}/approvers`,
  REMOVE: (approverId) => `${API_BASE}/workflow-definitions/approvers/${approverId}`,
}

// Step Rule endpoints
export const STEP_RULE_ENDPOINTS = {
  CREATE: `${API_BASE}/workflow-definitions/steps/rules`,
  LIST: (stepDefinitionId) => `${API_BASE}/workflow-definitions/steps/${stepDefinitionId}/rules`,
  UPDATE: (ruleId) => `${API_BASE}/workflow-definitions/steps/rules/${ruleId}`,
  DELETE: (ruleId) => `${API_BASE}/workflow-definitions/steps/rules/${ruleId}`,
}

// Work Item endpoints
export const WORK_ITEM_ENDPOINTS = {
  LIST: `${API_BASE}/work-items`,
  LIST_BY_WORKFLOW: (workflowDefinitionId) => `${API_BASE}/work-items/by-workflow/${workflowDefinitionId}`,
  GET: (workItemId) => `${API_BASE}/work-items/${workItemId}`,
  CREATE: `${API_BASE}/work-items`,
  SUBMIT: (workItemId) => `${API_BASE}/work-items/${workItemId}/submit`,
  CREATE_AND_SUBMIT: `${API_BASE}/work-items/submit`,
  VERSIONS: (workItemId) => `${API_BASE}/work-items/${workItemId}/versions`,
  PROGRESS: (workItemId) => `${API_BASE}/work-items/${workItemId}/workflow-progress`,
  ARCHIVE: (workItemId) => `${API_BASE}/work-items/${workItemId}/archive`,
  TYPES: `${API_BASE}/work-items/types`,
}

// Workflow execution endpoints
export const WORKFLOW_EXECUTION_ENDPOINTS = {
  START: `${API_BASE}/workflows/start`,
}

// Task endpoints (approver actions)
export const TASK_ENDPOINTS = {
  LIST: `${API_BASE}/tasks`,
  SEARCH: `${API_BASE}/tasks/search`,
  APPROVE: (taskId) => `${API_BASE}/tasks/${taskId}/approve`,
  REJECT: (taskId) => `${API_BASE}/tasks/${taskId}/reject`,
}

// Query parameter keys
export const QUERY_PARAMS = {
  CREATED_BY: 'createdBy',
  UPDATED_BY: 'updatedBy',
  SUBMITTED_BY: 'submittedBy',
  USER_ID: 'userId',
}
