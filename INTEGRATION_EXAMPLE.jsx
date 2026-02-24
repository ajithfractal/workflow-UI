/**
 * Example: How to integrate workflow layout engine in another application
 * 
 * This is a complete, standalone example that you can adapt for your application.
 */

import React, { useEffect, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'

// Import the layout utilities (copy these files to your app)
import { stagesToNodes, stagesToEdges } from './utils/workflowMapper'
import { getLayoutedElements, WORKFLOW_LAYOUT_CONFIG } from './utils/workflowLayout'

/**
 * Example component that displays a workflow diagram
 * 
 * @param {string} workflowId - The workflow ID to display
 */
function WorkflowDiagram({ workflowId }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(true)

  // Step 1: Fetch workflow from API
  useEffect(() => {
    async function fetchWorkflow() {
      try {
        setLoading(true)
        const response = await fetch(`/api/workflow-definitions/${workflowId}`)
        const data = await response.json()
        setWorkflow(data)
      } catch (error) {
        console.error('Failed to fetch workflow:', error)
      } finally {
        setLoading(false)
      }
    }

    if (workflowId) {
      fetchWorkflow()
    }
  }, [workflowId])

  // Step 2: Apply layout engine when workflow data changes
  useEffect(() => {
    if (!workflow) {
      setNodes([])
      setEdges([])
      return
    }

    // Check if workflow has stages
    if (!workflow.stages || workflow.stages.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    // Step 2a: Convert workflow stages to ReactFlow nodes/edges
    const flowNodes = stagesToNodes(workflow.stages, workflow.name)
    const flowEdges = stagesToEdges(workflow.stages)

    // Step 2b: Apply layout engine to compute positions
    // This will automatically position nodes even if visualStructure is null
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      flowNodes,
      flowEdges,
      WORKFLOW_LAYOUT_CONFIG
    )

    // Step 2c: Merge with saved positions if available
    // Priority: saved positions > computed positions
    const finalNodes = layoutedNodes.map(node => {
      const savedPosition = workflow?.visualStructure?.positions?.[node.id]
      return {
        ...node,
        // Use saved position if available, otherwise use computed position
        position: savedPosition || node.position,
      }
    })

    setNodes(finalNodes)
    setEdges(layoutedEdges)
  }, [workflow])

  if (loading) {
    return <div>Loading workflow...</div>
  }

  if (!workflow) {
    return <div>Workflow not found</div>
  }

  // Step 3: Render the diagram
  return (
    <div style={{ width: '100%', height: '600px', border: '1px solid #ddd' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{
          padding: 0.3,
          includeHiddenNodes: false,
          maxZoom: 2.0,
          minZoom: 0.2,
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: {
            type: 'arrowclosed',
            color: '#64b5f6',
          },
          style: { strokeWidth: 2, stroke: '#64b5f6' },
        }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

export default WorkflowDiagram

/**
 * USAGE:
 * 
 * <WorkflowDiagram workflowId="your-workflow-id" />
 * 
 * 
 * KEY POINTS:
 * 
 * 1. The layout engine automatically computes positions when visualStructure is null
 * 2. If visualStructure exists, it uses saved positions (user customizations)
 * 3. The merge logic ensures: saved positions > computed positions
 * 4. This works for both stage-based and legacy step-only workflows
 * 
 * DEPENDENCIES:
 * - dagre (required): npm install dagre
 * - reactflow (if using ReactFlow): npm install reactflow
 * 
 * FILES TO COPY:
 * - src/utils/workflowLayout.js
 * - src/utils/workflowMapper.js
 */
