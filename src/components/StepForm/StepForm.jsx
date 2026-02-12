import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X, Plus, Trash2 } from 'lucide-react'
import useWorkflowStore from '../../hooks/useWorkflow'
import '../../styles/StepForm.css'

const APPROVAL_TYPES = ['ALL', 'ANY', 'N_OF_M']
const APPROVER_TYPES = ['USER', 'ROLE', 'MANAGER']

function StepForm({ step, onClose }) {
  const { addStep, updateStep, addApprover, removeApprover } = useWorkflowStore()
  const [isNewStep, setIsNewStep] = useState(!step)
  const [approvers, setApprovers] = useState(step?.approvers || [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    defaultValues: step || {
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
      setApprovers(step.approvers || [])
    }
  }, [step])

  const onSubmit = async (data) => {
    try {
      if (isNewStep) {
        await addStep(data)
      } else {
        await updateStep(step.id, data)
      }
      onClose()
    } catch (error) {
      alert('Failed to save step: ' + error.message)
    }
  }

  const handleAddApprover = async () => {
    const approverType = prompt('Approver Type (USER/ROLE/MANAGER):')
    const approverValue = prompt('Approver Value:')

    if (approverType && approverValue) {
      try {
        const stepId = step?.id
        if (!stepId) {
          alert('Please save the step first before adding approvers')
          return
        }
        await addApprover(stepId, {
          type: approverType,
          value: approverValue,
        })
        // Reload approvers
        const updatedStep = useWorkflowStore.getState().workflow.steps.find(
          (s) => s.id === stepId
        )
        if (updatedStep) {
          setApprovers(updatedStep.approvers || [])
        }
      } catch (error) {
        alert('Failed to add approver: ' + error.message)
      }
    }
  }

  const handleRemoveApprover = async (approverId) => {
    try {
      await removeApprover(approverId)
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
            {approvers.length === 0 ? (
              <p className="empty-text">No approvers added yet</p>
            ) : (
              approvers.map((approver) => (
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
              ))
            )}
            {step && (
              <button
                type="button"
                className="btn-add-approver"
                onClick={handleAddApprover}
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
