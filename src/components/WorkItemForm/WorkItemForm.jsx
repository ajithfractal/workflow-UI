import { useState } from 'react'
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
} from '@mui/material'
import { Close } from '@mui/icons-material'
import { useCreateWorkItem } from '../../hooks/queries/useWorkItems'
import { useWorkflows } from '../../hooks/queries/useWorkflows'
import { useModal } from '../../hooks/useModal'
import Modal from '../Modal/Modal'

// Hardcoded work item types
const WORK_ITEM_TYPES = [
  'EMPLOYEE',
  'DOCUMENT',
  'INVOICE',
  'PURCHASE_ORDER',
  'EXPENSE',
  'LEAVE_REQUEST',
  'APPROVAL_REQUEST',
  'CONTRACT',
  'VENDOR',
  'ASSET',
  'OTHER',
]

function WorkItemForm({ workflowId: initialWorkflowId, workflowName, onClose, onSuccess }) {
  const createWorkItemMutation = useCreateWorkItem()
  const { modal, showAlert, closeModal } = useModal()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: workflows = [] } = useWorkflows()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    control,
  } = useForm({
    defaultValues: {
      workflowDefinitionId: initialWorkflowId || '',
      type: '',
      contentRef: '',
    },
  })

  const selectedWorkflowId = watch('workflowDefinitionId')
  const selectedWorkflow = workflows.find(w => (w.id || w.workflowId) === selectedWorkflowId)

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      const workItemData = {
        workflowDefinitionId: data.workflowDefinitionId,
        type: data.type,
      }
      // Only include contentRef if it was provided (when creating from general list)
      if (data.contentRef) {
        workItemData.contentRef = data.contentRef
      }
      const response = await createWorkItemMutation.mutateAsync({
        workItemData,
      })
      // Response contains workItemId
      const workItemId = response.workItemId || response.id
      showAlert('Work item created successfully!', 'success', 'Success')
      if (onSuccess) {
        onSuccess(workItemId)
      }
      onClose()
    } catch (error) {
      showAlert('Failed to create work item: ' + error.message, 'error', 'Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Create Work Item"
        action={
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        }
      />
      <CardContent>
        {initialWorkflowId && selectedWorkflow && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Workflow:</strong> {selectedWorkflow.name} {selectedWorkflow.version ? `(v${selectedWorkflow.version})` : ''}
            </Typography>
          </Box>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            {!initialWorkflowId && (
              <FormControl fullWidth required error={!!errors.workflowDefinitionId}>
                <InputLabel>Workflow Definition</InputLabel>
                <Controller
                  name="workflowDefinitionId"
                  control={control}
                  rules={{ required: 'Workflow Definition is required' }}
                  render={({ field }) => (
                    <Select {...field} label="Workflow Definition">
                      <MenuItem value="">Select a workflow...</MenuItem>
                      {workflows.map((workflow) => (
                        <MenuItem key={workflow.id || workflow.workflowId} value={workflow.id || workflow.workflowId}>
                          {workflow.name} {workflow.version ? `(v${workflow.version})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                {errors.workflowDefinitionId && (
                  <FormHelperText>{errors.workflowDefinitionId.message}</FormHelperText>
                )}
              </FormControl>
            )}

            <FormControl fullWidth required error={!!errors.type}>
              <InputLabel>Type</InputLabel>
              <Controller
                name="type"
                control={control}
                rules={{ required: 'Type is required' }}
                render={({ field }) => (
                  <Select {...field} label="Type">
                    <MenuItem value="">Select a type...</MenuItem>
                    {WORK_ITEM_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.type && (
                <FormHelperText>{errors.type.message}</FormHelperText>
              )}
            </FormControl>

            {!initialWorkflowId && (
              <TextField
                label="Content Reference"
                required
                fullWidth
                {...register('contentRef', { required: 'Content Reference is required' })}
                placeholder="e.g., employee-123, doc-456, etc."
                error={!!errors.contentRef}
                helperText={errors.contentRef?.message}
              />
            )}

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
              >
                {isSubmitting ? 'Creating...' : 'Create Work Item'}
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

export default WorkItemForm
