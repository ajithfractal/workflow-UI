import { create } from 'zustand'
import workflowApi from '../api/workflowApi'
import { mapWorkflowToUI, mapStepToBackend, mapApproverToBackend } from '../utils/workflowMapper'

const useWorkflowStore = create((set, get) => ({
  workflow: {
    id: null,
    name: '',
    version: 1,
    steps: [],
    isActive: false,
  },
  selectedStep: null,
  isLoading: false,
  error: null,

  // Load workflow
  loadWorkflow: async (workflowId) => {
    set({ isLoading: true, error: null })
    try {
      const backendWorkflow = await workflowApi.getWorkflow(workflowId)
      const uiWorkflow = mapWorkflowToUI(backendWorkflow)
      set({ workflow: uiWorkflow, isLoading: false })
      return uiWorkflow
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Create new workflow
  createWorkflow: async (name, version) => {
    set({ isLoading: true, error: null })
    try {
      const workflowId = await workflowApi.createWorkflow(name, version)
      set({
        workflow: {
          id: workflowId,
          name,
          version,
          steps: [],
          isActive: false,
        },
        isLoading: false,
      })
      return workflowId
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Add step
  addStep: async (stepData) => {
    const { workflow } = get()
    if (!workflow.id) {
      throw new Error('Workflow must be created first')
    }

    set({ isLoading: true, error: null })
    try {
      const backendStepData = mapStepToBackend(stepData)
      const stepId = await workflowApi.addStep(workflow.id, backendStepData)
      
      const newStep = {
        id: stepId,
        ...stepData,
        approvers: [],
      }

      set((state) => ({
        workflow: {
          ...state.workflow,
          steps: [...state.workflow.steps, newStep],
        },
        isLoading: false,
      }))

      return stepId
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Update step
  updateStep: async (stepId, stepData) => {
    const { workflow } = get()
    set({ isLoading: true, error: null })
    try {
      const backendStepData = mapStepToBackend(stepData)
      await workflowApi.updateStep(stepId, backendStepData)

      set((state) => ({
        workflow: {
          ...state.workflow,
          steps: state.workflow.steps.map((s) =>
            s.id === stepId ? { ...s, ...stepData } : s
          ),
        },
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Delete step
  deleteStep: async (stepId) => {
    set({ isLoading: true, error: null })
    try {
      await workflowApi.deleteStep(stepId)
      set((state) => ({
        workflow: {
          ...state.workflow,
          steps: state.workflow.steps.filter((s) => s.id !== stepId),
        },
        selectedStep: state.selectedStep?.id === stepId ? null : state.selectedStep,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Add approver
  addApprover: async (stepId, approverData) => {
    set({ isLoading: true, error: null })
    try {
      const backendApproverData = mapApproverToBackend(approverData)
      const approverId = await workflowApi.addApprover(stepId, backendApproverData)

      const newApprover = {
        id: approverId,
        ...approverData,
      }

      set((state) => ({
        workflow: {
          ...state.workflow,
          steps: state.workflow.steps.map((s) =>
            s.id === stepId
              ? { ...s, approvers: [...s.approvers, newApprover] }
              : s
          ),
        },
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Remove approver
  removeApprover: async (approverId) => {
    set({ isLoading: true, error: null })
    try {
      await workflowApi.removeApprover(approverId)
      set((state) => ({
        workflow: {
          ...state.workflow,
          steps: state.workflow.steps.map((s) => ({
            ...s,
            approvers: s.approvers.filter((a) => a.id !== approverId),
          })),
        },
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Set selected step
  setSelectedStep: (step) => {
    set({ selectedStep: step })
  },

  // Reset workflow
  resetWorkflow: () => {
    set({
      workflow: {
        id: null,
        name: '',
        version: 1,
        steps: [],
        isActive: false,
      },
      selectedStep: null,
      error: null,
    })
  },
}))

export default useWorkflowStore
