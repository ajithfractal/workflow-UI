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
  CircularProgress,
  FormHelperText,
  Alert,
} from '@mui/material'
import { Close, Delete, Lock } from '@mui/icons-material'
import { useWorkflow } from '../../hooks/queries/useWorkflows'
import { useCreateStage, useUpdateStage, useDeleteStage } from '../../hooks/queries/useStages'
import useWorkflowStore from '../../hooks/useWorkflow'
import { useModal } from '../../hooks/useModal'
import Modal from '../Modal/Modal'

const STEP_COMPLETION_TYPES = [
  { value: 'ALL', label: 'All Steps Must Complete' },
  { value: 'ANY', label: 'Any Step Completion Completes Stage' },
  { value: 'N_OF_M', label: 'Minimum Number of Steps Must Complete' },
]

function StageForm({ workflowId, stage, onClose, isReadOnly = false }) {
  // React Query hooks
  const { data: workflow } = useWorkflow(workflowId)
  const createStageMutation = useCreateStage()
  const updateStageMutation = useUpdateStage()
  const deleteStageMutation = useDeleteStage()
  
  // Modal hook
  const { modal, showAlert, showConfirm, closeModal } = useModal()
  
  // UI state
  const { setSelectedStep } = useWorkflowStore()
  const [isNewStage, setIsNewStage] = useState(!stage)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    control,
  } = useForm({
    defaultValues: {
      name: '',
      order: 1,
      stepCompletionType: 'ALL',
      minStepCompletions: null,
    },
  })

  const stepCompletionType = watch('stepCompletionType')

  useEffect(() => {
    if (stage) {
      // Reset form with stage values when editing
      reset({
        name: stage.name || '',
        order: stage.order || 1,
        stepCompletionType: stage.stepCompletionType || 'ALL',
        minStepCompletions: stage.minStepCompletions || null,
      })
      setIsNewStage(false)
    } else {
      // Reset form to defaults when creating new stage
      reset({
        name: '',
        order: 1,
        stepCompletionType: 'ALL',
        minStepCompletions: null,
      })
      setIsNewStage(true)
    }
  }, [stage, reset])

  const isSaving = createStageMutation.isPending || updateStageMutation.isPending
  const isDeleting = deleteStageMutation.isPending

  const handleDeleteStage = () => {
    if (!stage?.id) return
    showConfirm(
      `Are you sure you want to delete the stage "${stage.name}"? This will also delete all steps within this stage. This action cannot be undone.`,
      async () => {
        try {
          await deleteStageMutation.mutateAsync({
            stageId: stage.id,
            workflowId,
          })
          onClose()
        } catch (error) {
          showAlert('Failed to delete stage: ' + error.message, 'error', 'Error')
        }
      },
      'Delete Stage',
      'warning'
    )
  }

  const onSubmit = async (data) => {
    try {
      if (isNewStage) {
        if (!workflowId) {
          showAlert('Workflow must be created first', 'warning', 'Warning')
          return
        }
        
        await createStageMutation.mutateAsync({
          workflowId,
          stageData: {
            ...data,
            minStepCompletions: data.stepCompletionType === 'N_OF_M' ? data.minStepCompletions : null,
          },
        })
      } else {
        await updateStageMutation.mutateAsync({
          stageId: stage.id,
          workflowId,
          stageData: {
            ...data,
            minStepCompletions: data.stepCompletionType === 'N_OF_M' ? data.minStepCompletions : null,
          },
        })
      }
      onClose()
    } catch (error) {
      showAlert('Failed to save stage: ' + error.message, 'error', 'Error')
    }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={isReadOnly ? 'View Stage (Read Only)' : isNewStage ? 'New Stage' : 'Edit Stage'}
        action={
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        }
      />
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        {isReadOnly && (
          <Alert severity="info" icon={<Lock fontSize="small" />} sx={{ mb: 2 }}>
            This workflow is in use. Stages cannot be modified. Create a new version to make changes.
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            <TextField
              label="Stage Name"
              required
              fullWidth
              {...register('name', { required: 'Stage name is required' })}
              placeholder="e.g., Initial Assessment"
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={isReadOnly}
            />

            <TextField
              label="Stage Order"
              type="number"
              required
              fullWidth
              {...register('order', {
                required: 'Stage order is required',
                min: { value: 1, message: 'Order must be at least 1' },
              })}
              placeholder="1"
              error={!!errors.order}
              helperText={errors.order?.message || 'Stages with lower order run first'}
              disabled={isReadOnly}
            />

            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Step Completion Type</InputLabel>
              <Controller
                name="stepCompletionType"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select {...field} label="Step Completion Type" disabled={isReadOnly}>
                    {STEP_COMPLETION_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>
                Determines how steps within this stage complete
              </FormHelperText>
            </FormControl>

            {stepCompletionType === 'N_OF_M' && (
              <TextField
                label="Min Step Completions"
                type="number"
                required
                fullWidth
                {...register('minStepCompletions', {
                  required: 'Min step completions is required for N_OF_M',
                  min: { value: 1, message: 'Must be at least 1' },
                })}
                placeholder="2"
                error={!!errors.minStepCompletions}
                helperText={errors.minStepCompletions?.message || 'Minimum number of steps that must complete'}
                disabled={isReadOnly}
              />
            )}

            {!isNewStage && stage?.steps && stage.steps.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Steps in this Stage ({stage.steps.length})
                </Typography>
                <Stack spacing={1}>
                  {stage.steps.map((step) => (
                    <Box
                      key={step.id}
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {step.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Order: {step.order} | Type: {step.approvalType}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

          </Stack>
        </form>
      </CardContent>

      {/* Fixed bottom action bar */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* Delete button */}
        {!isNewStage && !isReadOnly && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleDeleteStage}
            disabled={isSaving || isDeleting}
            startIcon={isDeleting ? <CircularProgress size={14} /> : <Delete />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          disabled={isSaving || isDeleting}
        >
          {isReadOnly ? 'Close' : 'Cancel'}
        </Button>

        {!isReadOnly && (
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving || isDeleting}
            startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {isSaving ? (isNewStage ? 'Creating...' : 'Saving...') : (isNewStage ? 'Create Stage' : 'Save Changes')}
          </Button>
        )}
      </Box>
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

export default StageForm
