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
  Alert,
} from '@mui/material'
import { Close, Add, Delete, Lock, Edit } from '@mui/icons-material'
import { useWorkflow } from '../../hooks/queries/useWorkflows'
import { useAddStep, useUpdateStep, useDeleteStep } from '../../hooks/queries/useSteps'
import { useAddApprovers, useRemoveApprover } from '../../hooks/queries/useApprovers'
import { useStepRules, useCreateStepRule, useUpdateStepRule, useDeleteStepRule } from '../../hooks/queries/useRules'
import useWorkflowStore from '../../hooks/useWorkflow'
import { useModal } from '../../hooks/useModal'
import Loader from '../Loader/Loader'
import Modal from '../Modal/Modal'

const APPROVAL_TYPES = ['ALL', 'ANY', 'N_OF_M']
const APPROVER_TYPES = ['USER', 'ROLE', 'MANAGER']

// Rule types
const RULE_TYPES = [
  { value: 'AUTO_APPROVE', label: 'Auto Approve' },
  { value: 'ROUTE_APPROVER', label: 'Auto Delegate'},
  { value: 'CONDITIONAL_ROUTING', label: 'Conditional Routing' },
]

function StepForm({ workflowId, step, onClose, isReadOnly = false }) {
  // React Query hooks
  const { data: workflow } = useWorkflow(workflowId)
  const addStepMutation = useAddStep()
  const updateStepMutation = useUpdateStep()
  const deleteStepMutation = useDeleteStep()
  const addApproversMutation = useAddApprovers()
  const removeApproverMutation = useRemoveApprover()
  const createRuleMutation = useCreateStepRule()
  const updateRuleMutation = useUpdateStepRule()
  const deleteRuleMutation = useDeleteStepRule()
  
  // Get the current step (from prop or from workflow data)
  const currentStep = step || (workflow?.steps && step?.id ? workflow.steps.find((s) => s.id === step.id) : null)
  const stepDefinitionId = currentStep?.id || currentStep?.stepId || step?.id || step?.stepId
  const { data: rules = [], isLoading: isLoadingRules } = useStepRules(stepDefinitionId)
  
  // Modal hook
  const { modal, showAlert, showConfirm, closeModal } = useModal()
  
  // UI state
  const { setSelectedStep } = useWorkflowStore()
  const [isNewStep, setIsNewStep] = useState(!step)
  const [approvers, setApprovers] = useState(step?.approvers || [])
  const [showApproverForm, setShowApproverForm] = useState(false)
  const [newApprover, setNewApprover] = useState({ type: 'USER', value: '' })
  const [pendingApprovers, setPendingApprovers] = useState([]) // Approvers waiting to be submitted
  
  // Rules state
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState(null)
  const [newRule, setNewRule] = useState({
    ruleName: '',
    ruleType: 'AUTO_APPROVE',
    ruleExpression: '',
    priority: 0,
    isActive: true,
    description: '',
  })

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
  const isDeleting = deleteStepMutation.isPending
  const isAddingApprovers = addApproversMutation.isPending
  const isRemovingApprover = removeApproverMutation.isPending
  const isCreatingRule = createRuleMutation.isPending
  const isUpdatingRule = updateRuleMutation.isPending
  const isDeletingRule = deleteRuleMutation.isPending

  const handleDeleteStep = () => {
    if (!step?.id) return
    showConfirm(
      `Are you sure you want to delete the step "${step.name}"? This action cannot be undone.`,
      async () => {
        try {
          await deleteStepMutation.mutateAsync({
            stepId: step.id,
            workflowId,
          })
          onClose()
        } catch (error) {
          showAlert('Failed to delete step: ' + error.message, 'error', 'Error')
        }
      },
      'Delete Step',
      'warning'
    )
  }

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
        // Include approvers from both saved approvers and pending approvers when updating
        const allApprovers = [
          ...approvers,
          ...pendingApprovers.map(pa => ({
            type: pa.type,
            value: pa.value,
          }))
        ]
        
        await updateStepMutation.mutateAsync({
          stepId: step.id,
          workflowId,
          stepData: {
            ...data,
            approvers: allApprovers.length > 0 ? allApprovers : undefined,
          },
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

  // Rule handlers
  const handleAddRuleClick = () => {
    setEditingRuleId(null)
    setShowRuleForm(true)
    setNewRule({
      ruleName: '',
      ruleType: 'AUTO_APPROVE',
      ruleExpression: '',
      priority: 0,
      isActive: true,
      description: '',
    })
  }

  const handleEditRule = (rule) => {
    setEditingRuleId(rule.id || rule.ruleId)
    setShowRuleForm(true)
    setNewRule({
      ruleName: rule.ruleName || '',
      ruleType: rule.ruleType || 'AUTO_APPROVE',
      ruleExpression: typeof rule.ruleExpression === 'string' 
        ? rule.ruleExpression 
        : JSON.stringify(rule.ruleExpression || ''),
      priority: rule.priority !== undefined ? rule.priority : 0,
      isActive: rule.isActive !== undefined ? rule.isActive : true,
      description: rule.description || '',
    })
  }

  const handleCancelRule = () => {
    setEditingRuleId(null)
    setShowRuleForm(false)
    setNewRule({
      ruleName: '',
      ruleType: 'AUTO_APPROVE',
      ruleExpression: '',
      priority: 0,
      isActive: true,
      description: '',
    })
  }

  const handleCreateRule = async (e) => {
    e?.preventDefault()
    
    if (!newRule.ruleName.trim()) {
      showAlert('Please enter a rule name', 'warning', 'Validation Error')
      return
    }
    
    if (!newRule.ruleExpression.trim()) {
      showAlert('Please enter a rule expression', 'warning', 'Validation Error')
      return
    }

    // Get the current step ID (try from workflow data first, then from prop)
    const currentStep = workflow?.steps?.find((s) => s.id === step?.id) || step
    const stepDefinitionId = currentStep?.id || currentStep?.stepId || step?.id || step?.stepId
    
    if (!stepDefinitionId) {
      showAlert('Step must be saved first before adding rules. Please save the step and try again.', 'warning', 'Warning')
      return
    }

    try {
      await createRuleMutation.mutateAsync({
        stepDefinitionId: String(stepDefinitionId), // Ensure it's a string
        workflowId,
        ruleData: {
          ...newRule,
          ruleExpression: newRule.ruleExpression.trim(),
        },
      })
      handleCancelRule()
    } catch (error) {
      showAlert('Failed to create rule: ' + error.message, 'error', 'Error')
    }
  }

  const handleUpdateRule = async (e) => {
    e?.preventDefault()
    
    if (!newRule.ruleName.trim()) {
      showAlert('Please enter a rule name', 'warning', 'Validation Error')
      return
    }
    
    if (!newRule.ruleExpression.trim()) {
      showAlert('Please enter a rule expression', 'warning', 'Validation Error')
      return
    }

    if (!editingRuleId) {
      showAlert('Rule ID not found', 'error', 'Error')
      return
    }

    // Get the current step ID (try from workflow data first, then from prop)
    const currentStep = workflow?.steps?.find((s) => s.id === step?.id) || step
    const stepDefinitionId = currentStep?.id || currentStep?.stepId || step?.id || step?.stepId
    
    if (!stepDefinitionId) {
      showAlert('Step ID not found', 'error', 'Error')
      return
    }

    try {
      await updateRuleMutation.mutateAsync({
        ruleId: editingRuleId,
        stepDefinitionId: String(stepDefinitionId),
        workflowId,
        ruleData: {
          stepDefinitionId: String(stepDefinitionId),
          ...newRule,
          ruleExpression: newRule.ruleExpression.trim(),
        },
      })
      handleCancelRule()
    } catch (error) {
      showAlert('Failed to update rule: ' + error.message, 'error', 'Error')
    }
  }

  const handleDeleteRule = async (ruleId) => {
    showConfirm(
      'Are you sure you want to delete this rule?',
      async () => {
        try {
          const currentStep = workflow?.steps?.find((s) => s.id === step?.id) || step
          const stepDefinitionId = currentStep?.id || currentStep?.stepId || step?.id || step?.stepId
          if (!stepDefinitionId) {
            showAlert('Step ID not found', 'error', 'Error')
            return
          }
          await deleteRuleMutation.mutateAsync({
            ruleId,
            stepDefinitionId: String(stepDefinitionId),
            workflowId,
          })
        } catch (error) {
          showAlert('Failed to delete rule: ' + error.message, 'error', 'Error')
        }
      },
      'Delete Rule',
      'warning'
    )
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={isReadOnly ? 'View Step (Read Only)' : isNewStep ? 'New Step' : 'Edit Step'}
        action={
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        }
      />
      <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
        {isReadOnly && (
          <Alert severity="info" icon={<Lock fontSize="small" />} sx={{ mb: 2 }}>
            This workflow is in use. Steps cannot be modified. Create a new version to make changes.
          </Alert>
        )}
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
              disabled={isReadOnly}
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
              disabled={isReadOnly}
            />

            <FormControl fullWidth required disabled={isReadOnly}>
              <InputLabel>Approval Type</InputLabel>
              <Controller
                name="approvalType"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select {...field} label="Approval Type" disabled={isReadOnly}>
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
                disabled={isReadOnly}
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
              disabled={isReadOnly}
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
                    onDelete={isReadOnly ? undefined : () => handleRemoveApprover(approver.id)}
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
                  <Box sx={{ 
                    p: 2, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
                  }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 110 }}>
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
                          size="small"
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

                      {/* Pending approvers info */}
                      {pendingApprovers.length > 0 && (
                        <Typography variant="caption" color="warning.main" sx={{ fontWeight: 500 }}>
                          {pendingApprovers.length} approver{pendingApprovers.length !== 1 ? 's' : ''}{' '}
                          {isNewStep ? 'will be added with step' : 'ready to submit'}
                        </Typography>
                      )}

                      {/* Action buttons — stacked in their own row */}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleAddToPending}
                          startIcon={<Add />}
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
                            startIcon={isAddingApprovers ? <CircularProgress size={14} /> : null}
                          >
                            {isAddingApprovers ? 'Adding...' : `Submit (${pendingApprovers.length})`}
                          </Button>
                        )}
                        <Box sx={{ flex: 1 }} />
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
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

                {!showApproverForm && !isReadOnly && (
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

            {/* Rules Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Rules {isLoadingRules && <CircularProgress size={12} sx={{ ml: 1 }} />}
              </Typography>
              <Stack spacing={1}>
                {/* Existing rules */}
                {rules.length > 0 && rules.map((rule) => (
                  <Box
                    key={rule.id || rule.ruleId}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {rule.ruleName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Type: {RULE_TYPES.find(t => t.value === rule.ruleType)?.label || rule.ruleType}
                        {rule.priority !== undefined && ` | Priority: ${rule.priority}`}
                        {rule.isActive === false && ' | Inactive'}
                      </Typography>
                      {rule.description && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {rule.description}
                        </Typography>
                      )}
                      {rule.ruleExpression && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                          Expression: {typeof rule.ruleExpression === 'string' ? rule.ruleExpression : JSON.stringify(rule.ruleExpression)}
                        </Typography>
                      )}
                    </Box>
                    {!isReadOnly && (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditRule(rule)}
                          disabled={isUpdatingRule || isDeletingRule}
                          color="primary"
                          title="Edit Rule"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRule(rule.id || rule.ruleId)}
                          disabled={isDeletingRule || isUpdatingRule}
                          color="error"
                          title="Delete Rule"
                        >
                          {isDeletingRule ? <CircularProgress size={16} /> : <Delete />}
                        </IconButton>
                      </Stack>
                    )}
                  </Box>
                ))}

                {/* Add/Edit rule form */}
                {showRuleForm && (
                  <Box sx={{ 
                    p: 2, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      {editingRuleId ? 'Edit Rule' : 'Add New Rule'}
                    </Typography>
                    <Stack spacing={2}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Rule Name"
                        value={newRule.ruleName}
                        onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })}
                        placeholder="e.g., Auto-approve if amount <= 30000"
                        required
                      />
                      
                      <FormControl size="small" fullWidth>
                        <InputLabel>Rule Type</InputLabel>
                        <Select
                          value={newRule.ruleType}
                          onChange={(e) => setNewRule({ ...newRule, ruleType: e.target.value })}
                          label="Rule Type"
                        >
                          {RULE_TYPES.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        size="small"
                        fullWidth
                        label="Rule Expression (JSON)"
                        value={newRule.ruleExpression}
                        onChange={(e) => setNewRule({ ...newRule, ruleExpression: e.target.value })}
                        placeholder={"{\"condition\": \"variables['amount'] <= 30000\", \"actions\": {\"autoApprove\": true}}"}
                        multiline
                        rows={3}
                        required
                        helperText="JSON expression for the rule condition and actions"
                      />

                      <Stack direction="row" spacing={2}>
                        <TextField
                          size="small"
                          type="number"
                          label="Priority"
                          value={newRule.priority}
                          onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                          sx={{ width: 120 }}
                          helperText="Lower = higher priority"
                        />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={newRule.isActive ? 'active' : 'inactive'}
                            onChange={(e) => setNewRule({ ...newRule, isActive: e.target.value === 'active' })}
                            label="Status"
                          >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>

                      <TextField
                        size="small"
                        fullWidth
                        label="Description (Optional)"
                        value={newRule.description}
                        onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                        placeholder="Describe what this rule does"
                        multiline
                        rows={2}
                      />

                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleCancelRule}
                          disabled={isCreatingRule || isUpdatingRule}
                        >
                          Cancel
                        </Button>
                        {editingRuleId ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={handleUpdateRule}
                            disabled={isUpdatingRule || !step?.id}
                            startIcon={isUpdatingRule ? <CircularProgress size={14} /> : null}
                          >
                            {isUpdatingRule ? 'Updating...' : 'Update Rule'}
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={handleCreateRule}
                            disabled={isCreatingRule || !step?.id}
                            startIcon={isCreatingRule ? <CircularProgress size={14} /> : <Add />}
                          >
                            {isCreatingRule ? 'Creating...' : 'Create Rule'}
                          </Button>
                        )}
                      </Stack>
                      {!step?.id && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          Step must be saved first before adding rules
                        </Alert>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Empty state and add button */}
                {!showRuleForm && rules.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No rules added yet
                  </Typography>
                )}

                {!showRuleForm && !isReadOnly && (
                  <Button
                    startIcon={<Add />}
                    variant="outlined"
                    onClick={handleAddRuleClick}
                    size="small"
                  >
                    Add Rule
                  </Button>
                )}
              </Stack>
            </Box>

          </Stack>
        </form>
      </CardContent>

      {/* Fixed bottom action bar — outside CardContent so it never scrolls or overlaps */}
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
        {/* Delete button — pushed to the left */}
        {!isNewStep && !isReadOnly && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleDeleteStep}
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
            {isSaving ? (isNewStep ? 'Creating...' : 'Saving...') : (isNewStep ? 'Create Step' : 'Save Changes')}
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

export default StepForm
