import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Card,
  CardHeader,
  CardContent,
  IconButton,
  TextField,
  Button,
  Stack,
  Box,
  Typography,
  CircularProgress,
  FormHelperText,
  Chip,
  Divider,
} from '@mui/material'
import { Close, Add, Delete } from '@mui/icons-material'
import { useCreateAndSubmitWorkItem } from '../../hooks/queries/useWorkItems'
import { useModal } from '../../hooks/useModal'
import Modal from '../Modal/Modal'

function WorkItemSubmitForm({ onClose, onSuccess }) {
  const createAndSubmitMutation = useCreateAndSubmitWorkItem()
  const { modal, showAlert, closeModal } = useModal()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [variables, setVariables] = useState([]) // Array of {key: string, value: string}
  const [newVariable, setNewVariable] = useState({ key: '', value: '' })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: '',
      contentRef: '',
    },
  })

  const handleAddVariable = () => {
    if (!newVariable.key.trim()) {
      showAlert('Please enter a variable key', 'warning', 'Validation Error')
      return
    }
    // Check for duplicate keys
    if (variables.some(v => v.key === newVariable.key.trim())) {
      showAlert('Variable key already exists', 'warning', 'Validation Error')
      return
    }
    setVariables([...variables, { key: newVariable.key.trim(), value: newVariable.value.trim() }])
    setNewVariable({ key: '', value: '' })
  }

  const handleRemoveVariable = (keyToRemove) => {
    setVariables(variables.filter(v => v.key !== keyToRemove))
  }

  const handleEditVariable = (oldKey, newKey, newValue) => {
    // Check if new key already exists (and it's not the same key)
    if (newKey !== oldKey && variables.some(v => v.key === newKey.trim())) {
      showAlert('Variable key already exists', 'warning', 'Validation Error')
      return
    }
    setVariables(variables.map(v => 
      v.key === oldKey ? { key: newKey.trim(), value: newValue.trim() } : v
    ))
  }

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      
      // Build variables object from array
      const variablesObj = variables.reduce((acc, v) => {
        // Try to parse value as number or boolean, otherwise keep as string
        let parsedValue = v.value.trim()
        if (parsedValue === 'true') {
          parsedValue = true
        } else if (parsedValue === 'false') {
          parsedValue = false
        } else if (parsedValue === '') {
          parsedValue = null
        } else if (!isNaN(parsedValue) && parsedValue !== '') {
          // Check if it's a number (integer or float)
          parsedValue = parsedValue.includes('.') ? parseFloat(parsedValue) : parseInt(parsedValue, 10)
        }
        acc[v.key] = parsedValue
        return acc
      }, {})

      const submitData = {
        workItemId: null,
        type: data.type,
        contentRef: data.contentRef || undefined,
        variables: variablesObj,
      }

      const response = await createAndSubmitMutation.mutateAsync({
        submitData,
      })
      
      // Response contains workItemId
      const workItemId = response.workItemId || response.id || response.workItem?.id
      showAlert('Work item created and submitted successfully!', 'success', 'Success')
      if (onSuccess) {
        onSuccess(workItemId)
      }
      onClose()
    } catch (error) {
      showAlert('Failed to create and submit work item: ' + error.message, 'error', 'Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Create and Submit Work Item"
        action={
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        }
      />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            <TextField
              label="Type"
              required
              fullWidth
              {...register('type', { required: 'Type is required' })}
              placeholder="e.g., LOAN_APPLICATION, INVOICE, etc."
              error={!!errors.type}
              helperText={errors.type?.message}
            />

            <TextField
              label="Content Reference"
              fullWidth
              {...register('contentRef')}
              placeholder="e.g., https://storage.example.com/loan-docs/12345"
              error={!!errors.contentRef}
              helperText={errors.contentRef?.message || 'Optional: Reference to external content'}
            />

            <Divider sx={{ my: 1 }} />

            {/* Variables Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Variables
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add key-value pairs that will be used in workflow rules. Values can be strings, numbers, or booleans.
              </Typography>
              
              <Stack spacing={2}>
                {/* Existing variables */}
                {variables.length > 0 && (
                  <Stack spacing={1}>
                    {variables.map((variable, index) => (
                      <Box
                        key={variable.key}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            size="small"
                            label="Key"
                            value={variable.key}
                            onChange={(e) => handleEditVariable(variable.key, e.target.value, variable.value)}
                            sx={{ flex: 1 }}
                            disabled={isSubmitting}
                          />
                          <TextField
                            size="small"
                            label="Value"
                            value={variable.value}
                            onChange={(e) => handleEditVariable(variable.key, variable.key, e.target.value)}
                            sx={{ flex: 1 }}
                            placeholder="String, number, or boolean"
                            disabled={isSubmitting}
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveVariable(variable.key)}
                            disabled={isSubmitting}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}

                {/* Add variable form */}
                <Box sx={{ 
                  p: 2, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1, 
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
                }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        label="Key"
                        value={newVariable.key}
                        onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
                        placeholder="e.g., loanAmount"
                        sx={{ flex: 1 }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newVariable.key.trim()) {
                            e.preventDefault()
                            handleAddVariable()
                          }
                        }}
                      />
                      <TextField
                        size="small"
                        label="Value"
                        value={newVariable.value}
                        onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                        placeholder="e.g., 25000 or true or 'text'"
                        sx={{ flex: 1 }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newVariable.key.trim()) {
                            e.preventDefault()
                            handleAddVariable()
                          }
                        }}
                      />
                    </Stack>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleAddVariable}
                      startIcon={<Add />}
                      disabled={!newVariable.key.trim() || isSubmitting}
                    >
                      Add Variable
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      Tip: Numbers and booleans (true/false) will be automatically parsed. Strings don't need quotes.
                    </Typography>
                  </Stack>
                </Box>

                {variables.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No variables added yet. Variables can be used in workflow rules for conditional logic.
                  </Typography>
                )}
              </Stack>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
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
                {isSubmitting ? 'Creating and Submitting...' : 'Create and Submit'}
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

export default WorkItemSubmitForm
