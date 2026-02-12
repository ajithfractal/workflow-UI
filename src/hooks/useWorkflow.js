import { create } from 'zustand'

// Simplified Zustand store - only for UI state, not data fetching
// All data fetching is now handled by React Query
const useWorkflowStore = create((set) => ({
  selectedStep: null,

  // Set selected step (UI state only)
  setSelectedStep: (step) => {
    set({ selectedStep: step })
  },

  // Clear selected step
  clearSelectedStep: () => {
    set({ selectedStep: null })
  },
}))

export default useWorkflowStore
