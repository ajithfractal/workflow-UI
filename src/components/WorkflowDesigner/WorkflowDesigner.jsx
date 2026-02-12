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
  const {
    workflow,
    selectedStep,
    isLoading,
    error,
    loadWorkflow,
    createWorkflow,
    setSelectedStep,
    resetWorkflow,
  } = useWorkflowStore()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showStepForm, setShowStepForm] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowVersion, setWorkflowVersion] = useState(1)

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId).then((wf) => {
        setWorkflowName(wf.name)
        setWorkflowVersion(wf.version)
      })
    } else {
      resetWorkflow()
    }
  }, [workflowId, loadWorkflow, resetWorkflow])

  useEffect(() => {
    if (workflow.steps.length > 0) {
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
  }, [workflow.steps, setNodes, setEdges, workflow.name])

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'stepNode') {
      const step = workflow.steps.find((s) => s.id === node.data.step.id)
      setSelectedStep(step)
      setShowStepForm(true)
    }
  }, [workflow.steps, setSelectedStep])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleSaveWorkflow = async () => {
    if (!workflow.id && workflowName) {
      try {
        await createWorkflow(workflowName, workflowVersion)
      } catch (err) {
        alert('Failed to create workflow: ' + err.message)
      }
    }
  }

  if (isLoading) {
    return <div className="loading">Loading workflow...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
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
              step={selectedStep}
              onClose={() => {
                setShowStepForm(false)
                setSelectedStep(null)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkflowDesigner
