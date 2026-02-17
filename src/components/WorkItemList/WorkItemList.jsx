import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Add, Visibility, ArrowBack, Send, PlayArrow, Close } from '@mui/icons-material'
import { useWorkItems, useSubmitWorkItem, useStartWorkflow } from '../../hooks/queries/useWorkItems'
import { useWorkflows } from '../../hooks/queries/useWorkflows'
import { useModal } from '../../hooks/useModal'
import Loader from '../Loader/Loader'
import Modal from '../Modal/Modal'

function WorkItemList({ workflowId, onCreateWorkItem, onViewWorkItem, onBack }) {
  // Fetch work items - if workflowId is provided, use it as path variable
  const { data: workItems = [], isLoading, error } = useWorkItems(workflowId)
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useWorkflows()
  const { modal, showAlert, showConfirm, closeModal } = useModal()
  const submitWorkItemMutation = useSubmitWorkItem()
  const startWorkflowMutation = useStartWorkflow()
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedWorkItemId, setSelectedWorkItemId] = useState(null)
  const [contentRef, setContentRef] = useState('')

  // Start workflow modal state
  const [showStartWorkflowModal, setShowStartWorkflowModal] = useState(false)
  const [startWorkflowWorkItemId, setStartWorkflowWorkItemId] = useState(null)
  const [selectedWorkflowDefId, setSelectedWorkflowDefId] = useState('')

  if (isLoading) {
    return <Loader size="large" text="Loading work items..." />
  }

  if (error) {
    return (
      <Box>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            {onBack && (
              <IconButton onClick={onBack} title="Back to Workflows">
                <ArrowBack />
              </IconButton>
            )}
            <Typography variant="h5">Work Items</Typography>
          </Stack>
          <Alert severity="error">
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Error loading work items:
            </Typography>
            <Typography variant="body2">
              {error.message || 'Failed to load work items'}
            </Typography>
            {error.response && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Status: {error.response.status} - {error.response.statusText}
              </Typography>
            )}
          </Alert>
        </Paper>
      </Box>
    )
  }

  const getStatusChip = (status) => {
    const statusMap = {
      DRAFT: { label: 'Draft', color: 'default' },
      SUBMITTED: { label: 'Submitted', color: 'info' },
      IN_PROGRESS: { label: 'In Progress', color: 'warning' },
      IN_REVIEW: { label: 'In Review', color: 'info' },
      COMPLETED: { label: 'Completed', color: 'success' },
      REJECTED: { label: 'Rejected', color: 'error' },
    }
    const statusInfo = statusMap[status] || { label: status, color: 'default' }
    return (
      <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
    )
  }

  const handleSubmitWorkItem = (workItemId, workItemStatus, workItem) => {
    if (workItemStatus !== 'DRAFT') {
      showAlert('Only draft work items can be submitted.', 'warning', 'Cannot Submit')
      return
    }

    // Check if work item already has contentRef
    if (workItem?.contentRef) {
      showConfirm(
        'Are you sure you want to submit this work item?',
        async () => {
          try {
            await submitWorkItemMutation.mutateAsync({
              workItemId,
              submitRequest: { contentRef: workItem.contentRef },
            })
            showAlert('Work item submitted successfully!', 'success', 'Success')
          } catch (error) {
            showAlert('Failed to submit work item: ' + (error.message || 'Unknown error'), 'error', 'Error')
          }
        },
        'Submit Work Item',
        'warning'
      )
    } else {
      // Show form to collect contentRef
      setSelectedWorkItemId(workItemId)
      setContentRef('')
      setShowSubmitForm(true)
    }
  }

  const handleSubmitWithContentRef = async () => {
    if (!contentRef.trim()) {
      showAlert('Content Reference is required', 'error', 'Validation Error')
      return
    }

    try {
      await submitWorkItemMutation.mutateAsync({
        workItemId: selectedWorkItemId,
        submitRequest: { contentRef: contentRef.trim() },
      })
      showAlert('Work item submitted successfully!', 'success', 'Success')
      setShowSubmitForm(false)
      setContentRef('')
      setSelectedWorkItemId(null)
    } catch (error) {
      showAlert('Failed to submit work item: ' + (error.message || 'Unknown error'), 'error', 'Error')
    }
  }

  const handleStartWorkflow = (workItemId, workItemStatus, workflowDefId) => {
    if (!workItemId) {
      showAlert('Work item ID is required to start the workflow.', 'error', 'Error')
      return
    }

    if (workItemStatus === 'DRAFT') {
      // If draft, submit first which will start the workflow
      handleSubmitWorkItem(workItemId, workItemStatus)
      return
    }

    // If we already have a workflowDefId, start directly
    if (workflowDefId) {
      showConfirm(
        'Are you sure you want to start this workflow?',
        async () => {
          try {
            await startWorkflowMutation.mutateAsync({
              workItemId: String(workItemId),
              workflowDefId: String(workflowDefId),
              userId: 'user_1',
            })
            showAlert('Workflow started successfully!', 'success', 'Success')
          } catch (error) {
            showAlert('Failed to start workflow: ' + (error.message || 'Unknown error'), 'error', 'Error')
          }
        },
        'Start Workflow',
        'info'
      )
      return
    }

    // No workflowDefId — show modal to select one
    setStartWorkflowWorkItemId(workItemId)
    setSelectedWorkflowDefId('')
    setShowStartWorkflowModal(true)
  }

  const handleConfirmStartWorkflow = async () => {
    if (!selectedWorkflowDefId) {
      showAlert('Please select a workflow definition.', 'error', 'Validation Error')
      return
    }

    try {
      await startWorkflowMutation.mutateAsync({
        workItemId: String(startWorkflowWorkItemId),
        workflowDefId: String(selectedWorkflowDefId),
        userId: 'user_1',
      })
      showAlert('Workflow started successfully!', 'success', 'Success')
      setShowStartWorkflowModal(false)
      setStartWorkflowWorkItemId(null)
      setSelectedWorkflowDefId('')
    } catch (error) {
      showAlert('Failed to start workflow: ' + (error.message || 'Unknown error'), 'error', 'Error')
    }
  }

  // Filter only active workflows for the selection
  const activeWorkflows = workflows.filter((wf) => wf.isActive)

  return (
    <Box>
      {/* Only show header if onBack is provided (standalone page) */}
      {onBack && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton onClick={onBack} title="Back to Workflows">
                <ArrowBack />
              </IconButton>
              <Typography variant="h5">Work Items</Typography>
            </Stack>
            {workflowId && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onCreateWorkItem}
              >
                Create and Submit Work Item
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        {workItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {workflowId
                ? `No work items found for this workflow.`
                : 'No work items found in the system.'}
            </Typography>
            {workflowId && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onCreateWorkItem}
              >
                Create and Submit Work Item
              </Button>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Current Step</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(workItems) && workItems.map((workItem) => {
                  const workItemId = workItem.workItemId || workItem.instanceId || workItem.id || workItem.workItemInstanceId
                  
                  return (
                    <TableRow key={workItemId} hover>
                      <TableCell>{workItemId || 'N/A'}</TableCell>
                      <TableCell>{workItem.workflowName || 'N/A'}</TableCell>
                      <TableCell>{workItem.type || 'N/A'}</TableCell>
                      <TableCell>{getStatusChip(workItem.status)}</TableCell>
                      <TableCell>{workItem.currentStepName || 'N/A'}</TableCell>
                      <TableCell>{workItem.createdAt ? new Date(workItem.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => onViewWorkItem(workItemId)}
                            title="View Details"
                            color="primary"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          {workItem.status === 'DRAFT' && (
                            <IconButton
                              size="small"
                              onClick={() => handleSubmitWorkItem(workItemId, workItem.status, workItem)}
                              title="Submit Work Item"
                              disabled={submitWorkItemMutation.isPending}
                              color="primary"
                            >
                              {submitWorkItemMutation.isPending ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Send fontSize="small" />
                              )}
                            </IconButton>
                          )}
                          {(workItem.status === 'SUBMITTED') && (
                            <IconButton
                              size="small"
                              onClick={() => handleStartWorkflow(
                                workItemId, 
                                workItem.status,
                                workItem.workflowDefinitionId || workItem.workflowDefId || workflowId
                              )}
                              title="Start Workflow"
                              disabled={startWorkflowMutation.isPending}
                              color="success"
                            >
                              {startWorkflowMutation.isPending ? (
                                <CircularProgress size={16} />
                              ) : (
                                <PlayArrow fontSize="small" />
                              )}
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Submit Form Dialog */}
      <Dialog
        open={showSubmitForm}
        onClose={() => setShowSubmitForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Submit Work Item
          <IconButton
            aria-label="close"
            onClick={() => setShowSubmitForm(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Content Reference"
            required
            fullWidth
            value={contentRef}
            onChange={(e) => setContentRef(e.target.value)}
            placeholder="e.g., employee-123, doc-456, etc."
            sx={{ mt: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Enter a reference to the content associated with this work item.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowSubmitForm(false)
              setContentRef('')
              setSelectedWorkItemId(null)
            }}
            disabled={submitWorkItemMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitWithContentRef}
            disabled={submitWorkItemMutation.isPending || !contentRef.trim()}
            variant="contained"
            startIcon={submitWorkItemMutation.isPending ? <CircularProgress size={16} /> : <Send />}
          >
            {submitWorkItemMutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Start Workflow Dialog — Select Workflow Definition */}
      <Dialog
        open={showStartWorkflowModal}
        onClose={() => setShowStartWorkflowModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Start Workflow
          <IconButton
            aria-label="close"
            onClick={() => setShowStartWorkflowModal(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Select a workflow definition to start for this work item.
          </Typography>
          {isLoadingWorkflows ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : activeWorkflows.length === 0 ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              No active workflow definitions found. Please create and activate a workflow first.
            </Alert>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="workflow-select-label">Workflow Definition</InputLabel>
              <Select
                labelId="workflow-select-label"
                value={selectedWorkflowDefId}
                onChange={(e) => setSelectedWorkflowDefId(e.target.value)}
                label="Workflow Definition"
              >
                {activeWorkflows.map((wf) => (
                  <MenuItem key={wf.id} value={wf.id}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                      <Typography variant="body1">{wf.name}</Typography>
                      <Chip label={`v${wf.version}`} size="small" sx={{ ml: 1, fontSize: '0.7rem', height: 20 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                        {wf.steps?.length || 0} steps
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowStartWorkflowModal(false)
              setStartWorkflowWorkItemId(null)
              setSelectedWorkflowDefId('')
            }}
            disabled={startWorkflowMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmStartWorkflow}
            disabled={startWorkflowMutation.isPending || !selectedWorkflowDefId}
            variant="contained"
            color="success"
            startIcon={startWorkflowMutation.isPending ? <CircularProgress size={16} /> : <PlayArrow />}
          >
            {startWorkflowMutation.isPending ? 'Starting...' : 'Start Workflow'}
          </Button>
        </DialogActions>
      </Dialog>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        showCancel={modal.showCancel}
      />
    </Box>
  )
}

export default WorkItemList
