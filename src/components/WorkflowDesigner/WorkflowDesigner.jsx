import { useEffect, useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Box, Alert, Typography, Fade } from '@mui/material'
import { useWorkflow, useCreateWorkflow, useUpdateWorkflow, useWorkflows } from '../../hooks/queries/useWorkflows'
import { useWorkItems } from '../../hooks/queries/useWorkItems'
import useWorkflowStore from '../../hooks/useWorkflow'
import { useModal } from '../../hooks/useModal'
import { stepsToNodes, stepsToEdges } from '../../utils/workflowMapper'
import StartNode from './NodeTypes/StartNode'
import StepNode from './NodeTypes/StepNode'
import EndNode from './NodeTypes/EndNode'
import StepForm from '../StepForm/StepForm'
import Toolbar from './Toolbar'
import Loader from '../Loader/Loader'
import Modal from '../Modal/Modal'

function WorkflowDesigner({ workflowId, onBack, onCreateWorkItem, onNavigateToWorkflow }) {
  const nodeTypes = useMemo(() => ({
  startNode: StartNode,
  stepNode: StepNode,
  endNode: EndNode,
  }), [])
  // Use React Query for data fetching
  const { data: workflow, isLoading, error } = useWorkflow(workflowId)
  const { data: allWorkflows = [] } = useWorkflows()
  const { data: workItemsForWorkflow = [], isLoading: isLoadingWorkItems } = useWorkItems(workflowId)
  const createWorkflowMutation = useCreateWorkflow()
  const updateWorkflowMutation = useUpdateWorkflow()
  const { selectedStep, setSelectedStep } = useWorkflowStore()
  const { modal, showAlert, showConfirm, closeModal } = useModal()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showStepForm, setShowStepForm] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowVersion, setWorkflowVersion] = useState(1)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)

  // Check if workflow is in use by work items (any work item exists for this workflow)
  const isInUse = !!(workflowId && workItemsForWorkflow.length > 0)

  // Initialize workflow name/version from fetched data
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name || '')
      setWorkflowVersion(workflow.version || 1)
    } else if (!workflowId) {
      setWorkflowName('')
      setWorkflowVersion(1)
    }
  }, [workflow, workflowId])

  // Update nodes/edges when workflow steps change
  useEffect(() => {
    if (workflow?.steps && workflow.steps.length > 0) {
      const flowNodes = stepsToNodes(workflow.steps, workflow.name)
      const flowEdges = stepsToEdges(workflow.steps)
      setNodes(flowNodes)
      setEdges(flowEdges)
    } else {
      // Initial nodes: just start and end
      setNodes([
        {
          id: 'start',
          type: 'startNode',
          position: { x: 400, y: 50 },
          data: { label: 'SUBMITTED' },
        },
        {
          id: 'end',
          type: 'endNode',
          position: { x: 400, y: 200 },
          data: { label: 'COMPLETED' },
        },
      ])
      setEdges([])
    }
  }, [workflow?.steps, workflow?.name, setNodes, setEdges])

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'stepNode' && workflow?.steps) {
      const step = workflow.steps.find((s) => s.id === node.data.step.id)
      setSelectedStep(step)
      setShowStepForm(true)
    }
  }, [workflow?.steps, setSelectedStep])

  const onConnect = useCallback(
    (params) => {
      if (isInUse) return // Prevent edge modifications when locked
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges, isInUse]
  )

  const handleSaveWorkflow = async () => {
    if (!workflowName.trim()) {
      showAlert('Please enter a workflow name', 'warning', 'Validation Error')
      return
    }

    if (workflow?.id) {
      // Updating an existing workflow
      const nameChanged = workflowName !== workflow.name
      const versionChanged = workflowVersion !== workflow.version

      if (!nameChanged && !versionChanged) {
        showAlert('No changes to save.', 'info', 'No Changes')
        return
      }

      try {
        await updateWorkflowMutation.mutateAsync({
          workflowId: workflow.id,
          updateData: {
            name: workflowName,
            version: workflowVersion,
          },
        })
        showAlert('Workflow updated successfully!', 'success', 'Success')
      } catch (err) {
        showAlert('Failed to update workflow: ' + err.message, 'error', 'Error')
      }
    } else {
      // Creating a brand new workflow
      setIsSettingUp(true)
      try {
        const response = await createWorkflowMutation.mutateAsync({
          name: workflowName,
          version: workflowVersion,
        })
        // Extract the new workflow ID from response
        const newWorkflowId = typeof response === 'string'
          ? response
          : response?.workflowId || response?.id || null

        if (newWorkflowId && onNavigateToWorkflow) {
          // Short delay for nice transition effect, then navigate
          setTimeout(() => {
            onNavigateToWorkflow(newWorkflowId)
            setIsSettingUp(false)
            // Auto-open step form after a brief moment so user can start adding steps
            setTimeout(() => {
              setSelectedStep(null)
              setShowStepForm(true)
            }, 500)
          }, 1500)
        } else {
          setIsSettingUp(false)
          showAlert('Workflow created successfully!', 'success', 'Success')
        }
      } catch (err) {
        setIsSettingUp(false)
        showAlert('Failed to create workflow: ' + err.message, 'error', 'Error')
      }
    }
  }

  const handleAddStep = () => {
    if (isInUse) {
      showAlert(
        'This workflow definition is being used by work items. You cannot modify it. Please create a new version.',
        'warning',
        'Workflow Locked'
      )
      return
    }
    if (!workflow?.id) {
      showAlert('Please save the workflow first before adding steps', 'warning', 'Warning')
      return
    }
    setSelectedStep(null)
    setShowStepForm(true)
  }

  const handleCreateNewVersion = async () => {
    if (!workflow) return

    const currentName = workflow.name
    const nextVersion = (workflow.version || 1) + 1

    // Check if a workflow with the same name and next version already exists
    const existingNextVersion = allWorkflows.find(
      (wf) => wf.name === currentName && wf.version === nextVersion
    )

    if (existingNextVersion) {
      // A newer version already exists — navigate to it
      showConfirm(
        `Version ${nextVersion} of "${currentName}" already exists. Do you want to open it for editing?`,
        () => {
          if (onNavigateToWorkflow) {
            onNavigateToWorkflow(existingNextVersion.id)
          }
        },
        'Version Exists',
        'info'
      )
      return
    }

    // Create a new version
    setIsCreatingVersion(true)
    try {
      const response = await createWorkflowMutation.mutateAsync({
        name: currentName,
        version: nextVersion,
      })
      // Extract the actual workflow ID from the response
      // API may return a string ID, or an object like { workflowId: "...", ... }
      const newWorkflowId = typeof response === 'string'
        ? response
        : response?.workflowId || response?.id || response
      showAlert(
        `New version ${nextVersion} of "${currentName}" created successfully! Navigating to the new version...`,
        'success',
        'New Version Created'
      )
      // Navigate to the new workflow
      if (onNavigateToWorkflow && newWorkflowId) {
        setTimeout(() => {
          onNavigateToWorkflow(newWorkflowId)
        }, 1000)
      }
    } catch (err) {
      showAlert('Failed to create new version: ' + err.message, 'error', 'Error')
    } finally {
      setIsCreatingVersion(false)
    }
  }

  const handleStepFormClose = () => {
    setShowStepForm(false)
    setSelectedStep(null)
  }

  if (isLoading || isSettingUp) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          gap: 3,
        }}
      >
        <Fade in timeout={600}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', opacity: 1 },
                  '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            >
              <Typography variant="h4" sx={{ color: 'white' }}>✨</Typography>
            </Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {isSettingUp ? 'Setting up your workflow designer...' : 'Loading workflow...'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {isSettingUp
                ? 'Your workflow has been created. Preparing the designer so you can start adding steps.'
                : 'Fetching workflow details, please wait.'}
            </Typography>
            <Loader size="medium" />
          </Box>
        </Fade>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error: {error.message || 'Failed to load workflow'}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar
        workflowName={workflowName}
        workflowVersion={workflowVersion}
        onWorkflowNameChange={setWorkflowName}
        onWorkflowVersionChange={setWorkflowVersion}
        onSave={handleSaveWorkflow}
        onBack={onBack}
        onAddStep={handleAddStep}
        canAddStep={!!workflowId && !isInUse}
        isSaving={createWorkflowMutation.isPending || updateWorkflowMutation.isPending}
        onCreateWorkItem={onCreateWorkItem}
        canCreateWorkItem={!!workflowId && workflow?.isActive}
        isLocked={isInUse}
        onCreateNewVersion={handleCreateNewVersion}
        isCreatingVersion={isCreatingVersion}
      />

      {/* Spacer for fixed header - matches Toolbar height */}
      <Box sx={{ height: (theme) => theme.mixins.toolbar.minHeight || '64px' }} />

      {/* Warning banner when workflow is in use */}
      {isInUse && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          This workflow definition is being used by <strong>{workItemsForWorkflow.length}</strong> work item(s).
          Steps cannot be added, edited, or deleted. To make changes, create a new version.
        </Alert>
      )}

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isInUse ? undefined : onNodesChange}
            onEdgesChange={isInUse ? undefined : onEdgesChange}
            onConnect={isInUse ? undefined : onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            nodesDraggable={!isInUse}
            nodesConnectable={!isInUse}
            elementsSelectable={!isInUse}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: {
                type: 'arrowclosed',
                color: '#3b82f6',
              },
              style: { strokeWidth: 2, stroke: '#3b82f6' },
            }}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Box>

        {showStepForm && (
          <Box sx={{ width: 400, borderLeft: 1, borderColor: 'divider', overflow: 'auto' }}>
            <StepForm
              workflowId={workflow?.id}
              step={selectedStep}
              onClose={handleStepFormClose}
              isReadOnly={isInUse}
            />
          </Box>
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
    </Box>
  )
}

export default WorkflowDesigner
