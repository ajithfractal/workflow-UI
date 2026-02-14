import { useEffect, useState } from 'react'
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
} from '@mui/material'
import { ArrowBack, Send, Close } from '@mui/icons-material'
import { useWorkItem, useWorkflowProgress, useSubmitWorkItem } from '../../hooks/queries/useWorkItems'
import { useWorkflow } from '../../hooks/queries/useWorkflows'
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

const nodeTypes = {
  startNode: StartNode,
  stepNode: StepNode,
  endNode: EndNode,
}

function WorkItemViewer({ workItemId, onBack }) {
  const { data: workItem, isLoading: isLoadingWorkItem } = useWorkItem(workItemId)
  const { data: progress, isLoading: isLoadingProgress, error: progressError } = useWorkflowProgress(workItemId)
  const submitWorkItemMutation = useSubmitWorkItem()
  const { modal, showAlert, showConfirm, closeModal } = useModal()
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [contentRef, setContentRef] = useState('')

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

        if (stepInst.status === 'COMPLETED') {
          node.data.isCompleted = true
          node.data.isCurrent = false
        } else if (stepInst.status === 'IN_PROGRESS') {
          node.data.isCurrent = true
          node.data.isCompleted = false
        } else {
          // NOT_STARTED or others
          node.data.isCompleted = false
          node.data.isCurrent = false
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
  const wfStatus = wfInstance?.status || workItem.status
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
                {getStatusChip(wfStatus)}
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
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* Details Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Details
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status:
                    </Typography>
                    <Typography variant="body2">{wfStatus}</Typography>
                  </Box>
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

            {/* Progress Card */}
            {progress && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Progress
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {/* Progress bar */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {completedCount} of {totalSteps} steps completed
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {percentage}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: percentage === 100 ? '#10b981' : '#3b82f6',
                          },
                        }}
                      />
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
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1,
                                borderRadius: 1,
                                bgcolor:
                                  step.status === 'COMPLETED'
                                    ? '#d1fae5'
                                    : step.status === 'IN_PROGRESS'
                                    ? '#dbeafe'
                                    : '#f5f5f5',
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                  {step.status === 'COMPLETED' ? '✅' : step.status === 'IN_PROGRESS' ? '🔄' : '⏳'}
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
                </CardContent>
              </Card>
            )}
          </Stack>
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
