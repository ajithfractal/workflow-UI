import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Card,
  CardHeader,
  CardContent,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Box,
  Typography,
  Chip,
  CircularProgress,
  FormHelperText,
} from '@mui/material'
import { Close, Add, Delete } from '@mui/icons-material'
import { useWorkflow } from '../../hooks/queries/useWorkflows'
import { useAddStep, useUpdateStep } from '../../hooks/queries/useSteps'
import { useAddApprovers, useRemoveApprover } from '../../hooks/queries/useApprovers'
import useWorkflowStore from '../../hooks/useWorkflow'
import { useModal } from '../../hooks/useModal'
import Loader from '../Loader/Loader'
import Modal from '../Modal/Modal'

const APPROVAL_TYPES = ['ALL', 'ANY', 'N_OF_M']
const APPROVER_TYPES = ['USER', 'ROLE', 'MANAGER']

function StepForm({ workflowId, step, onClose }) {
  // React Query hooks
  const { data: workflow } = useWorkflow(workflowId)
  const addStepMutation = useAddStep()
  const updateStepMutation = useUpdateStep()
  const addApproversMutation = useAddApprovers()
  const removeApproverMutation = useRemoveApprover()
  
  // Modal hook
  const { modal, showAlert, closeModal } = useModal()
  
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
    control,
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

  const isSaving = addStepMutation.isPending || updateStepMutation.isPending
  const isAddingApprovers = addApproversMutation.isPending
  const isRemovingApprover = removeApproverMutation.isPending

  const onSubmit = async (data) => {
    try {
      if (isNewStep) {
        if (!workflowId) {
          showAlert('Workflow must be created first', 'warning', 'Warning')
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
      showAlert('Failed to save step: ' + error.message, 'error', 'Error')
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
      showAlert('Please enter an approver value', 'warning', 'Validation Error')
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
      showAlert('Step ID is required', 'error', 'Error')
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
      showAlert('Failed to add approvers: ' + error.message, 'error', 'Error')
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
      showAlert('Failed to remove approver: ' + error.message, 'error', 'Error')
    }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={isNewStep ? 'New Step' : 'Edit Step'}
        action={
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        }
      />
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            <TextField
              label="Step Name"
              required
              fullWidth
              {...register('name', { required: 'Step name is required' })}
              placeholder="e.g., Finance Approval"
              error={!!errors.name}
              helperText={errors.name?.message}
            />

            <TextField
              label="Step Order"
              type="number"
              required
              fullWidth
              {...register('order', {
                required: 'Step order is required',
                min: { value: 1, message: 'Order must be at least 1' },
              })}
              placeholder="1"
              error={!!errors.order}
              helperText={errors.order?.message || 'Steps with same order run in parallel'}
            />

            <FormControl fullWidth required>
              <InputLabel>Approval Type</InputLabel>
              <Controller
                name="approvalType"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select {...field} label="Approval Type">
                    {APPROVAL_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>

            {approvalType === 'N_OF_M' && (
              <TextField
                label="Min Approvals"
                type="number"
                required
                fullWidth
                {...register('minApprovals', {
                  required: 'Min approvals is required for N_OF_M',
                  min: { value: 1, message: 'Must be at least 1' },
                })}
                placeholder="2"
                error={!!errors.minApprovals}
                helperText={errors.minApprovals?.message}
              />
            )}

            <TextField
              label="SLA Hours"
              type="number"
              fullWidth
              {...register('slaHours', { min: { value: 1, message: 'Must be positive' } })}
              placeholder="24"
              error={!!errors.slaHours}
              helperText={errors.slaHours?.message}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Approvers
              </Typography>
              <Stack spacing={1}>
                {/* Existing saved approvers */}
                {approvers.length > 0 && approvers.map((approver) => (
                  <Chip
                    key={approver.id}
                    label={`${approver.value} (${approver.type})`}
                    onDelete={() => handleRemoveApprover(approver.id)}
                    disabled={isRemovingApprover}
                    deleteIcon={
                      isRemovingApprover ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Delete />
                      )
                    }
                  />
                ))}

                {/* Pending approvers */}
                {pendingApprovers.length > 0 && pendingApprovers.map((pendingApprover) => (
                  <Chip
                    key={pendingApprover.id}
                    label={`${pendingApprover.value} (${pendingApprover.type})`}
                    onDelete={() => handleRemovePendingApprover(pendingApprover.id)}
                    color="warning"
                    variant="outlined"
                    deleteIcon={<Delete />}
                  />
                ))}

                {/* Add approver form */}
                {showApproverForm && (
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2}>
                        <FormControl sx={{ minWidth: 120 }}>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={newApprover.type}
                            onChange={(e) => setNewApprover({ ...newApprover, type: e.target.value })}
                            label="Type"
                          >
                            {APPROVER_TYPES.map((type) => (
                              <MenuItem key={type} value={type}>
                                {type}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          fullWidth
                          value={newApprover.value}
                          onChange={(e) => setNewApprover({ ...newApprover, value: e.target.value })}
                          placeholder="Enter approver value"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddToPending(e)
                            }
                          }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleAddToPending}
                        >
                          Add to List
                        </Button>
                        {pendingApprovers.length > 0 && !isNewStep && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={handleSubmitPendingApprovers}
                            disabled={isAddingApprovers}
                            startIcon={isAddingApprovers ? <CircularProgress size={16} /> : null}
                          >
                            {isAddingApprovers ? 'Adding...' : `Submit (${pendingApprovers.length})`}
                          </Button>
                        )}
                        {pendingApprovers.length > 0 && isNewStep && (
                          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
                            {pendingApprovers.length} approver{pendingApprovers.length !== 1 ? 's' : ''} will be added with step
                          </Typography>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleCancelApprover}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                )}

                {/* Empty state and add button */}
                {!showApproverForm && approvers.length === 0 && pendingApprovers.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No approvers added yet
                  </Typography>
                )}

                {!showApproverForm && (
                  <Button
                    startIcon={<Add />}
                    variant="outlined"
                    onClick={handleAddApproverClick}
                    size="small"
                  >
                    Add Approver
                  </Button>
                )}
              </Stack>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSaving}
                startIcon={isSaving ? <CircularProgress size={16} /> : null}
              >
                {isSaving ? (isNewStep ? 'Creating...' : 'Saving...') : (isNewStep ? 'Create Step' : 'Save Changes')}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        showCancel={modal.showCancel}
      />
    </Card>
  )
}

export default StepForm
