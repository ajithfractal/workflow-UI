import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { ArrowBack, Send, Close, PlayArrow } from '@mui/icons-material'
import { useWorkItem, useWorkflowProgress, useSubmitWorkItem, useStartWorkflow } from '../../hooks/queries/useWorkItems'
import { useWorkflow, useWorkflows } from '../../hooks/queries/useWorkflows'
import { useModal } from '../../hooks/useModal'
import { stepsToNodes, stepsToEdges } from '../../utils/workflowMapper'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import StartNode from '../WorkflowDesigner/NodeTypes/StartNode'
import StepNode from '../WorkflowDesigner/NodeTypes/StepNode'
import EndNode from '../WorkflowDesigner/NodeTypes/EndNode'
import Loader from '../Loader/Loader'
import Modal from '../Modal/Modal'

function WorkItemViewer({ workItemId, onBack }) {
  const nodeTypes = useMemo(() => ({
    startNode: StartNode,
    stepNode: StepNode,
    endNode: EndNode,
  }), [])
  const { data: workItem, isLoading: isLoadingWorkItem } = useWorkItem(workItemId)
  const [isWfActive, setIsWfActive] = useState(false)
  const { data: progress, isLoading: isLoadingProgress, error: progressError } = useWorkflowProgress(workItemId, { polling: isWfActive })
  const { data: allWorkflows = [], isLoading: isLoadingWorkflows } = useWorkflows()
  const submitWorkItemMutation = useSubmitWorkItem()
  const startWorkflowMutation = useStartWorkflow()
  const { modal, showAlert, showConfirm, closeModal } = useModal()
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [contentRef, setContentRef] = useState('')

  // Start workflow modal state
  const [showStartWorkflowModal, setShowStartWorkflowModal] = useState(false)
  const [selectedWorkflowDefId, setSelectedWorkflowDefId] = useState('')

  // Enable polling only when workflow instance is actively running
  // Stop polling when workflow is completed, failed, or cancelled
  useEffect(() => {
    const status = progress?.workflowInstance?.status
    // Only poll if status is explicitly IN_PROGRESS
    // Stop polling for COMPLETED, FAILED, CANCELLED, or any other status
    const shouldPoll = status === 'IN_PROGRESS'
    
    // Only update if state actually changed to prevent unnecessary re-renders
    if (isWfActive !== shouldPoll) {
      setIsWfActive(shouldPoll)
    }
  }, [progress?.workflowInstance?.status, isWfActive])

  // Extract workflowId from progress response (progress API returns workflowInstance)
  // Fall back to workItem fields if available
  const workflowId = progress?.workflowInstance?.workflowId || workItem?.workflowDefinitionId || workItem?.workflowId
  const { data: workflow, isLoading: isLoadingWorkflow } = useWorkflow(workflowId)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Build diagram from workflow definition, then overlay progress status
  useEffect(() => {
    if (!workflow?.steps || workflow.steps.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    // Build diagram from workflow definition (has approvers, approvalType, etc.)
    const flowNodes = stepsToNodes(workflow.steps, workflow.name)
    const flowEdges = stepsToEdges(workflow.steps)

    // Initialize default state
    flowNodes.forEach((node) => {
      node.data.isCompleted = false
      node.data.isCurrent = false
      node.data.isFailed = false
      node.data.stepStatus = null
    })

    // Overlay progress status from the progress API
    if (progress?.steps && Array.isArray(progress.steps) && progress.steps.length > 0) {
      // Build a lookup map: stepId -> step instance from progress
      const progressStepMap = new Map()
      progress.steps.forEach((stepInst) => {
        progressStepMap.set(stepInst.stepId, stepInst)
      })

      const currentStepId = progress.currentStep?.stepId

      flowNodes.forEach((node) => {
        if (node.type !== 'stepNode') return
        const stepId = node.data.step?.id
        if (!stepId) return

        const stepInst = progressStepMap.get(stepId)
        if (!stepInst) return

        node.data.stepStatus = stepInst.status

        if (stepInst.status === 'FAILED' || stepInst.status === 'REJECTED') {
          node.data.isFailed = true
          node.data.isCompleted = false
          node.data.isCurrent = false
        } else if (stepInst.status === 'COMPLETED') {
          node.data.isCompleted = true
          node.data.isCurrent = false
          node.data.isFailed = false
        } else if (stepInst.status === 'IN_PROGRESS') {
          node.data.isCurrent = true
          node.data.isCompleted = false
          node.data.isFailed = false
        } else {
          // NOT_STARTED or others
          node.data.isCompleted = false
          node.data.isCurrent = false
          node.data.isFailed = false
        }
      })
    }

    // Create new references so React Flow re-renders
    const updatedNodes = flowNodes.map((node) => ({
      ...node,
      data: { ...node.data },
    }))

    setNodes(updatedNodes)
    setEdges(flowEdges)
  }, [workflow, progress, setNodes, setEdges])

  const handleSubmit = () => {
    if (workItem?.contentRef) {
      showConfirm(
        'Are you sure you want to submit this work item? This will start the workflow execution.',
        async () => {
          try {
            await submitWorkItemMutation.mutateAsync({
              workItemId,
              submitRequest: { contentRef: workItem.contentRef },
            })
            showAlert('Work item submitted successfully! Workflow execution has started.', 'success', 'Success')
          } catch (error) {
            showAlert('Failed to submit work item: ' + error.message, 'error', 'Error')
          }
        },
        'Submit Work Item',
        'warning'
      )
    } else {
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
        workItemId,
        submitRequest: { contentRef: contentRef.trim() },
      })
      showAlert('Work item submitted successfully! Workflow execution has started.', 'success', 'Success')
      setShowSubmitForm(false)
      setContentRef('')
    } catch (error) {
      showAlert('Failed to submit work item: ' + error.message, 'error', 'Error')
    }
  }

  // Filter only active workflows for the selection modal
  const activeWorkflows = allWorkflows.filter((wf) => wf.isActive)

  const handleStartWorkflow = () => {
    const existingDefId = workItem?.workflowDefinitionId || workItem?.workflowDefId
    if (existingDefId) {
      // Already has a workflow definition — confirm and start directly
      showConfirm(
        'Are you sure you want to start this workflow?',
        async () => {
          try {
            await startWorkflowMutation.mutateAsync({
              workItemId: String(workItemId),
              workflowDefId: String(existingDefId),
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
    } else {
      // No workflow definition — show selection modal
      setSelectedWorkflowDefId('')
      setShowStartWorkflowModal(true)
    }
  }

  const handleConfirmStartWorkflow = async () => {
    if (!selectedWorkflowDefId) {
      showAlert('Please select a workflow definition.', 'error', 'Validation Error')
      return
    }
    try {
      await startWorkflowMutation.mutateAsync({
        workItemId: String(workItemId),
        workflowDefId: String(selectedWorkflowDefId),
        userId: 'user_1',
      })
      showAlert('Workflow started successfully!', 'success', 'Success')
      setShowStartWorkflowModal(false)
      setSelectedWorkflowDefId('')
    } catch (error) {
      showAlert('Failed to start workflow: ' + (error.message || 'Unknown error'), 'error', 'Error')
    }
  }

  if (isLoadingWorkItem) {
    return <Loader size="large" text="Loading work item..." />
  }

  const getStatusChip = (status) => {
    const statusMap = {
      DRAFT: { label: 'Draft', color: 'default' },
      SUBMITTED: { label: 'Submitted', color: 'info' },
      IN_REVIEW: { label: 'In Review', color: 'info' },
      IN_PROGRESS: { label: 'In Progress', color: 'warning' },
      COMPLETED: { label: 'Completed', color: 'success' },
      NOT_STARTED: { label: 'Not Started', color: 'default' },
      REJECTED: { label: 'Rejected', color: 'error' },
      FAILED: { label: 'Failed', color: 'error' },
    }
    const statusInfo = statusMap[status] || { label: status, color: 'default' }
    return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
  }

  if (!workItem) {
    return (
      <Box>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <IconButton onClick={onBack} title="Back">
              <ArrowBack />
            </IconButton>
            <Typography variant="h5">Work Item Not Found</Typography>
          </Stack>
          <Alert severity="error">The requested work item could not be found.</Alert>
        </Paper>
      </Box>
    )
  }

  const canSubmit = workItem.status === 'DRAFT'

  // Derive display values from progress API
  const wfInstance = progress?.workflowInstance
  const workItemStatus = workItem.status  // Work item's own status (e.g. IN_REVIEW)
  const wfInstanceStatus = wfInstance?.status  // Workflow instance status (e.g. IN_PROGRESS)
  const wfName = wfInstance?.workflowName || workItem.workflowName || 'N/A'
  const currentStepName = progress?.currentStep?.stepName
  const progressInfo = progress?.progress
  const completedCount = progressInfo?.completedSteps || 0
  const totalSteps = progressInfo?.totalSteps || 0
  const percentage = progressInfo?.percentage || 0

  // Build step status summary from progress.steps
  const stepSummary = progress?.steps?.map((s) => ({
    name: s.stepName,
    order: s.stepOrder,
    status: s.status,
    tasks: s.tasks,
  })) || []

  // Calculate progress percentages for multi-color bar
  const completedSteps = stepSummary.filter(s => s.status === 'COMPLETED').length
  const failedSteps = stepSummary.filter(s => s.status === 'FAILED' || s.status === 'REJECTED').length
  const completedPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
  const failedPercentage = totalSteps > 0 ? (failedSteps / totalSteps) * 100 : 0
  const remainingPercentage = 100 - completedPercentage - failedPercentage

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flex={1}>
            <IconButton onClick={onBack} title="Back">
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h5">
                {workItem.title || `Work Item #${workItem.workItemId || workItem.instanceId || workItem.id}`}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                {getStatusChip(workItemStatus)}
                {wfInstanceStatus && (
                  <Chip
                    label={`Workflow: ${wfInstanceStatus.replace(/_/g, ' ')}`}
                    size="small"
                    color={wfInstanceStatus === 'COMPLETED' ? 'success' : wfInstanceStatus === 'IN_PROGRESS' ? 'warning' : 'default'}
                    variant="outlined"
                  />
                )}
                <Typography variant="body2" color="text.secondary">
                  Workflow: {wfName}
                </Typography>
                {currentStepName && (
                  <Typography variant="body2" color="text.secondary">
                    Current Step: {currentStepName}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {canSubmit && (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitWorkItemMutation.isPending}
                startIcon={submitWorkItemMutation.isPending ? <CircularProgress size={16} /> : <Send />}
              >
                {submitWorkItemMutation.isPending ? 'Submitting...' : 'Submit & Start Workflow'}
              </Button>
            )}
            {workItemStatus === 'SUBMITTED' && !wfInstance && (
              <Button
                variant="contained"
                color="success"
                onClick={handleStartWorkflow}
                disabled={startWorkflowMutation.isPending}
                startIcon={startWorkflowMutation.isPending ? <CircularProgress size={16} /> : <PlayArrow />}
              >
                {startWorkflowMutation.isPending ? 'Starting...' : 'Start Workflow'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                },
              },
            }}
          >
            <Stack spacing={2}>
            {/* Details Card */}
            <Card>
              <CardContent sx={{ pb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  Details
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Work Item Status:
                    </Typography>
                    <Typography variant="body2">{workItemStatus}</Typography>
                  </Box>
                  {wfInstanceStatus && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Workflow Status:
                      </Typography>
                      <Typography variant="body2">{wfInstanceStatus}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Created:
                    </Typography>
                    <Typography variant="body2">
                      {workItem.createdAt ? new Date(workItem.createdAt).toLocaleString() : 'N/A'}
                    </Typography>
                  </Box>
                  {wfInstance?.startedAt && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Workflow Started:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(wfInstance.startedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {workItem.description && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Description:
                      </Typography>
                      <Typography variant="body2">{workItem.description}</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Progress Accordion */}
            {progress && (
              <Accordion defaultExpanded>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  aria-controls="progress-content"
                  id="progress-header"
                >
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    Progress
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1.5}>
                    {/* Progress bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {completedSteps} of {totalSteps} steps fully completed
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {Math.round(completedPercentage)}%
                        </Typography>
                      </Box>
                      {/* Custom multi-color progress bar */}
                      <Box
                        sx={(theme) => ({
                          height: 8,
                          borderRadius: 4,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                        })}
                      >
                        {/* Green portion for completed steps */}
                        {completedPercentage > 0 && (
                          <Box
                            sx={{
                              width: `${completedPercentage}%`,
                              height: '100%',
                              bgcolor: '#10b981',
                              borderRadius: completedPercentage === 100 ? '4px' : '4px 0 0 4px',
                            }}
                          />
                        )}
                        {/* Red portion for failed/rejected steps */}
                        {failedPercentage > 0 && (
                          <Box
                            sx={{
                              width: `${failedPercentage}%`,
                              height: '100%',
                              bgcolor: '#ef4444',
                              borderRadius: completedPercentage === 0 && failedPercentage === 100 ? '4px' : '0',
                            }}
                          />
                        )}
                        {/* Grey portion for remaining/not started steps */}
                        {remainingPercentage > 0 && (
                          <Box
                            sx={(theme) => ({
                              width: `${remainingPercentage}%`,
                              height: '100%',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                              borderRadius: '0 4px 4px 0',
                            })}
                          />
                        )}
                      </Box>
                    </Box>

                    {currentStepName && (
                      <Box>
                        <Typography variant="body2">
                          <strong>Current Step:</strong> {currentStepName}
                        </Typography>
                      </Box>
                    )}

                    {/* Step status list */}
                    {stepSummary.length > 0 && (
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Steps:
                        </Typography>
                        <Stack spacing={1}>
                          {stepSummary.map((step, idx) => (
                            <Box
                              key={idx}
                              sx={(theme) => ({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1,
                                borderRadius: 1,
                                bgcolor:
                                  step.status === 'FAILED' || step.status === 'REJECTED'
                                    ? (theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee2e2')
                                    : step.status === 'COMPLETED'
                                    ? (theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.15)' : '#d1fae5')
                                    : step.status === 'IN_PROGRESS'
                                    ? (theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.15)' : '#dbeafe')
                                    : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f5f5f5'),
                              })}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                  {step.status === 'FAILED' || step.status === 'REJECTED' ? '❌' : step.status === 'COMPLETED' ? '✅' : step.status === 'IN_PROGRESS' ? '🔄' : '⏳'}
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                  {step.name}
                                </Typography>
                              </Stack>
                              {getStatusChip(step.status)}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Variables Accordion */}
            {(workItem?.latestVersion?.variables || workItem?.versions?.[0]?.variables) && (
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  aria-controls="variables-content"
                  id="variables-header"
                >
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    Variables
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0.5}>
                    {Object.entries(workItem?.latestVersion?.variables || workItem?.versions?.[0]?.variables || {}).map(([key, value]) => {
                      // Format the value for display
                      let displayValue = value
                      if (typeof value === 'boolean') {
                        displayValue = value ? 'true' : 'false'
                      } else if (typeof value === 'object' && value !== null) {
                        displayValue = JSON.stringify(value, null, 2)
                      } else {
                        displayValue = String(value)
                      }

                      return (
                        <Box
                          key={key}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: 0.5,
                            px: 1,
                            minHeight: '32px',
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 0.5,
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: '120px', textTransform: 'capitalize', fontSize: '0.7rem', fontWeight: 500 }}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              fontFamily: typeof value === 'number' || typeof value === 'boolean' ? 'inherit' : 'monospace',
                              wordBreak: 'break-word',
                              flex: 1,
                            }}
                          >
                            {displayValue}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
          </Box>
        </Grid>

        {/* Workflow Diagram */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflow Progress
              </Typography>
              {progressError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Error loading progress: {progressError.message || 'Failed to load workflow progress'}
                </Alert>
              )}
              <Box sx={{ height: 500, mt: 2 }}>
                {isLoadingProgress || isLoadingWorkflow ? (
                  <Loader size="medium" text="Loading workflow diagram..." />
                ) : !workflow?.steps || workflow.steps.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {isLoadingProgress
                        ? 'Loading progress...'
                        : !workflowId
                        ? 'Workflow not started yet.'
                        : 'No workflow data available.'}
                    </Typography>
                  </Box>
                ) : nodes.length === 0 ? (
                  <Loader size="medium" text="Preparing workflow diagram..." />
                ) : (
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    defaultEdgeOptions={{
                      type: 'smoothstep',
                      markerEnd: {
                        type: 'arrowclosed',
                        color: '#3b82f6',
                      },
                      style: { strokeWidth: 2, stroke: '#3b82f6' },
                    }}
                  >
                    <Background />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
              <InputLabel id="viewer-workflow-select-label">Workflow Definition</InputLabel>
              <Select
                labelId="viewer-workflow-select-label"
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

export default WorkItemViewer
