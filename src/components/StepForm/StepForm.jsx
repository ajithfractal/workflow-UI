import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X, Plus, Trash2 } from 'lucide-react'
import { useWorkflow } from '../../hooks/queries/useWorkflows'
import { useAddStep, useUpdateStep } from '../../hooks/queries/useSteps'
import { useAddApprovers, useRemoveApprover } from '../../hooks/queries/useApprovers'
import useWorkflowStore from '../../hooks/useWorkflow'
import '../../styles/StepForm.css'

const APPROVAL_TYPES = ['ALL', 'ANY', 'N_OF_M']
const APPROVER_TYPES = ['USER', 'ROLE', 'MANAGER']

function StepForm({ workflowId, step, onClose }) {
  // React Query hooks
  const { data: workflow } = useWorkflow(workflowId)
  const addStepMutation = useAddStep()
  const updateStepMutation = useUpdateStep()
  const addApproversMutation = useAddApprovers()
  const removeApproverMutation = useRemoveApprover()
  
  // UI state
  const { setSelectedStep } = useWorkflowStore()
  const [isNewStep, setIsNewStep] = useState(!step)
  const [approvers, setApprovers] = useState(step?.approvers || [])
  const [showApproverForm, setShowApproverForm] = useState(false)
  const [newApprover, setNewApprover] = useState({ type: 'USER', value: '' })
  const [pendingApprovers, setPendingApprovers] = useState([]) // Approvers waiting to be submitted

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      order: 1,
      approvalType: 'ALL',
      minApprovals: 1,
      slaHours: 24,
    },
  })

  const approvalType = watch('approvalType')

  useEffect(() => {
    if (step) {
      // Reset form with step values when editing
      reset({
        name: step.name || '',
        order: step.order || 1,
        approvalType: step.approvalType || 'ALL',
        minApprovals: step.minApprovals || 1,
        slaHours: step.slaHours || 24,
      })
      setApprovers(step.approvers || [])
      setIsNewStep(false)
      setPendingApprovers([]) // Clear pending when step changes
      setShowApproverForm(false)
    } else {
      // Reset form to defaults when creating new step
      reset({
        name: '',
        order: 1,
        approvalType: 'ALL',
        minApprovals: 1,
        slaHours: 24,
      })
      setIsNewStep(true)
      setApprovers([])
      setPendingApprovers([]) // Clear pending
      setShowApproverForm(false)
    }
  }, [step, reset])

  // Sync approvers when workflow updates (React Query will handle refetching)
  useEffect(() => {
    if (step?.id && workflow?.steps) {
      const updatedStep = workflow.steps.find((s) => s.id === step.id)
      if (updatedStep) {
        setApprovers(updatedStep.approvers || [])
      }
    }
  }, [workflow?.steps, step?.id])

  const onSubmit = async (data) => {
    try {
      if (isNewStep) {
        if (!workflowId) {
          alert('Workflow must be created first')
          return
        }
        // Include approvers from both saved approvers and pending approvers
        const allApprovers = [
          ...approvers,
          ...pendingApprovers.map(pa => ({
            type: pa.type,
            value: pa.value,
          }))
        ]
        
        await addStepMutation.mutateAsync({
          workflowId,
          stepData: {
            ...data,
            approvers: allApprovers.length > 0 ? allApprovers : undefined,
          },
        })
      } else {
        await updateStepMutation.mutateAsync({
          stepId: step.id,
          workflowId,
          stepData: data,
        })
      }
      onClose()
    } catch (error) {
      alert('Failed to save step: ' + error.message)
    }
  }

  const handleAddApproverClick = () => {
    // Allow adding approvers for both new and existing steps
    setShowApproverForm(true)
    setNewApprover({ type: 'USER', value: '' })
  }

  const handleAddToPending = (e) => {
    e?.preventDefault()
    
    if (!newApprover.value.trim()) {
      alert('Please enter an approver value')
      return
    }

    // Add to pending list (not saved yet)
    const pendingApprover = {
      id: `pending-${Date.now()}-${Math.random()}`, // Temporary ID
      type: newApprover.type,
      value: newApprover.value.trim(),
    }
    
    setPendingApprovers([...pendingApprovers, pendingApprover])
    
    // Reset form but keep it open for adding more
    setNewApprover({ type: 'USER', value: '' })
  }

  const handleRemovePendingApprover = (pendingId) => {
    setPendingApprovers(pendingApprovers.filter((a) => a.id !== pendingId))
  }

  const handleSubmitPendingApprovers = async () => {
    if (pendingApprovers.length === 0) {
      return
    }

    // If it's a new step, just close the form (approvers will be submitted with step)
    if (isNewStep) {
      setShowApproverForm(false)
      setNewApprover({ type: 'USER', value: '' })
      return
    }

    // For existing steps, add approvers via API
    if (!step?.id) {
      alert('Step ID is required')
      return
    }

    try {
      // Convert pending approvers to API format
      const approversToAdd = pendingApprovers.map((pa) => ({
        approverType: pa.type,
        approverValue: pa.value,
      }))
      
      // Send all approvers at once - React Query will automatically refetch workflow
      await addApproversMutation.mutateAsync({
        stepId: step.id,
        workflowId,
        approversArray: approversToAdd,
      })
      
      // React Query will automatically update workflow data, so we can sync approvers
      if (workflow?.steps) {
        const updatedStep = workflow.steps.find((s) => s.id === step.id)
        if (updatedStep) {
          setApprovers(updatedStep.approvers || [])
        }
      }
      
      // Clear pending approvers and close form
      setPendingApprovers([])
      setShowApproverForm(false)
      setNewApprover({ type: 'USER', value: '' })
    } catch (error) {
      alert('Failed to add approvers: ' + error.message)
    }
  }

  const handleCancelApprover = () => {
    setShowApproverForm(false)
    setNewApprover({ type: 'USER', value: '' })
    setPendingApprovers([]) // Clear pending when canceling
  }

  const handleRemoveApprover = async (approverId) => {
    try {
      // React Query will automatically refetch workflow after removal
      await removeApproverMutation.mutateAsync({ approverId, workflowId })
      // Optimistically update local state
      setApprovers(approvers.filter((a) => a.id !== approverId))
    } catch (error) {
      alert('Failed to remove approver: ' + error.message)
    }
  }

  return (
    <div className="step-form">
      <div className="step-form-header">
        <h3>{isNewStep ? 'New Step' : 'Edit Step'}</h3>
        <button className="btn-icon" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="step-form-body">
        <div className="form-group">
          <label>Step Name *</label>
          <input
            {...register('name', { required: 'Step name is required' })}
            placeholder="e.g., Finance Approval"
          />
          {errors.name && <span className="error-text">{errors.name.message}</span>}
        </div>

        <div className="form-group">
          <label>Step Order *</label>
          <input
            type="number"
            {...register('order', {
              required: 'Step order is required',
              min: { value: 1, message: 'Order must be at least 1' },
            })}
            placeholder="1"
          />
          {errors.order && <span className="error-text">{errors.order.message}</span>}
          <small>Steps with same order run in parallel</small>
        </div>

        <div className="form-group">
          <label>Approval Type *</label>
          <select {...register('approvalType', { required: true })}>
            {APPROVAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {approvalType === 'N_OF_M' && (
          <div className="form-group">
            <label>Min Approvals *</label>
            <input
              type="number"
              {...register('minApprovals', {
                required: 'Min approvals is required for N_OF_M',
                min: { value: 1, message: 'Must be at least 1' },
              })}
              placeholder="2"
            />
            {errors.minApprovals && (
              <span className="error-text">{errors.minApprovals.message}</span>
            )}
          </div>
        )}

        <div className="form-group">
          <label>SLA Hours</label>
          <input
            type="number"
            {...register('slaHours', { min: { value: 1, message: 'Must be positive' } })}
            placeholder="24"
          />
          {errors.slaHours && <span className="error-text">{errors.slaHours.message}</span>}
        </div>

        <div className="form-group">
          <label>Approvers</label>
          <div className="approvers-list">
            {/* Existing saved approvers */}
            {approvers.length > 0 && approvers.map((approver) => (
              <div key={approver.id} className="approver-item">
                <span>
                  {approver.value} ({approver.type})
                </span>
                <button
                  type="button"
                  className="btn-icon btn-danger"
                  onClick={() => handleRemoveApprover(approver.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Pending approvers (not yet saved) */}
            {pendingApprovers.length > 0 && pendingApprovers.map((pendingApprover) => (
              <div key={pendingApprover.id} className="approver-item approver-item-pending">
                <span>
                  {pendingApprover.value} ({pendingApprover.type})
                  <span className="pending-badge">Pending</span>
                </span>
                <button
                  type="button"
                  className="btn-icon btn-danger"
                  onClick={() => handleRemovePendingApprover(pendingApprover.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            
            {/* Add approver form - show for both new and existing steps */}
            {showApproverForm && (
              <div className="approver-form">
                <div className="approver-form-row">
                  <select
                    value={newApprover.type}
                    onChange={(e) => setNewApprover({ ...newApprover, type: e.target.value })}
                    className="approver-type-select"
                  >
                    {APPROVER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newApprover.value}
                    onChange={(e) => setNewApprover({ ...newApprover, value: e.target.value })}
                    placeholder="Enter approver value"
                    className="approver-value-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddToPending(e)
                      }
                    }}
                  />
                </div>
                <div className="approver-form-actions">
                  <button
                    type="button"
                    className="btn-small btn-primary"
                    onClick={handleAddToPending}
                  >
                    Add to List
                  </button>
                  {pendingApprovers.length > 0 && !isNewStep && (
                    <button
                      type="button"
                      className="btn-small btn-success"
                      onClick={handleSubmitPendingApprovers}
                    >
                      Submit ({pendingApprovers.length})
                    </button>
                  )}
                  {pendingApprovers.length > 0 && isNewStep && (
                    <span className="pending-info">
                      {pendingApprovers.length} approver{pendingApprovers.length !== 1 ? 's' : ''} will be added with step
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-small btn-secondary"
                    onClick={handleCancelApprover}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Empty state and add button */}
            {!showApproverForm && approvers.length === 0 && pendingApprovers.length === 0 && (
              <p className="empty-text">No approvers added yet</p>
            )}
            
            {!showApproverForm && (
              <button
                type="button"
                className="btn-add-approver"
                onClick={handleAddApproverClick}
              >
                <Plus size={16} />
                Add Approver
              </button>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {isNewStep ? 'Create Step' : 'Save Changes'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default StepForm
