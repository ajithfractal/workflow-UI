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
import { useWorkflow, useCreateWorkflow } from '../../hooks/queries/useWorkflows'
import useWorkflowStore from '../../hooks/useWorkflow'
import { stepsToNodes, stepsToEdges } from '../../utils/workflowMapper'
import StartNode from './NodeTypes/StartNode'
import StepNode from './NodeTypes/StepNode'
import EndNode from './NodeTypes/EndNode'
import StepForm from '../StepForm/StepForm'
import Toolbar from './Toolbar'
import '../../styles/WorkflowDesigner.css'

const nodeTypes = {
  startNode: StartNode,
  stepNode: StepNode,
  endNode: EndNode,
}

function WorkflowDesigner({ workflowId, onBack }) {
  // Use React Query for data fetching
  const { data: workflow, isLoading, error } = useWorkflow(workflowId)
  const createWorkflowMutation = useCreateWorkflow()
  const { selectedStep, setSelectedStep } = useWorkflowStore()

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
        alert('Workflow created successfully! Please refresh or navigate back to see it.')
      } catch (err) {
        alert('Failed to create workflow: ' + err.message)
      }
    }
  }

  const handleAddStep = () => {
    if (!workflow?.id) {
      alert('Please save the workflow first before adding steps')
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
    return <div className="loading">Loading workflow...</div>
  }

  if (error) {
    return <div className="error">Error: {error.message || 'Failed to load workflow'}</div>
  }

  return (
    <div className="workflow-designer">
      <Toolbar
        workflowName={workflowName}
        workflowVersion={workflowVersion}
        onWorkflowNameChange={setWorkflowName}
        onWorkflowVersionChange={setWorkflowVersion}
        onSave={handleSaveWorkflow}
        onBack={onBack}
        onAddStep={handleAddStep}
        canAddStep={!!workflow?.id}
      />

      <div className="designer-container">
        <div className="designer-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {showStepForm && (
          <div className="step-panel">
            <StepForm
              workflowId={workflow?.id}
              step={selectedStep}
              onClose={handleStepFormClose}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkflowDesigner
