import { useEffect, useCallback, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Box, Paper, Alert } from '@mui/material'
import { useWorkflow, useCreateWorkflow } from '../../hooks/queries/useWorkflows'
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

const nodeTypes = {
  startNode: StartNode,
  stepNode: StepNode,
  endNode: EndNode,
}

function WorkflowDesigner({ workflowId, onBack, onCreateWorkItem }) {
  // Use React Query for data fetching
  const { data: workflow, isLoading, error } = useWorkflow(workflowId)
  const createWorkflowMutation = useCreateWorkflow()
  const { selectedStep, setSelectedStep } = useWorkflowStore()
  const { modal, showAlert, closeModal } = useModal()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showStepForm, setShowStepForm] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowVersion, setWorkflowVersion] = useState(1)

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
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleSaveWorkflow = async () => {
    if (!workflow?.id && workflowName) {
      try {
        await createWorkflowMutation.mutateAsync({
          name: workflowName,
          version: workflowVersion,
        })
        // Note: After creation, the workflow list will be invalidated
        // User should navigate back and select the new workflow
        showAlert('Workflow created successfully! Please refresh or navigate back to see it.', 'success', 'Success')
      } catch (err) {
        showAlert('Failed to create workflow: ' + err.message, 'error', 'Error')
      }
    }
  }

  const handleAddStep = () => {
    if (!workflow?.id) {
      showAlert('Please save the workflow first before adding steps', 'warning', 'Warning')
      return
    }
    setSelectedStep(null)
    setShowStepForm(true)
  }

  const handleStepFormClose = () => {
    setShowStepForm(false)
    setSelectedStep(null)
  }

  if (isLoading) {
    return <Loader size="large" text="Loading workflow..." />
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
        canAddStep={!!workflow?.id}
        isSaving={createWorkflowMutation.isPending}
        onCreateWorkItem={onCreateWorkItem}
        canCreateWorkItem={!!workflow?.id && workflow?.isActive}
      />

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
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
