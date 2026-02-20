import dagre from 'dagre'

/**
 * Node dimension constants - explicit sizes for each node type
 */
export const NODE_DIMENSIONS = {
  startNode: { width: 180, height: 60 },
  endNode: { width: 180, height: 60 },
  stageNode: { width: 280, height: 140 }, // Base height, will adjust based on content
  stepNode: { width: 150, height: 100 },
}

/**
 * Calculate stage node height based on content
 */
export const getStageNodeHeight = (stage) => {
  const baseHeight = 140
  const stageSteps = stage.steps || []
  const stepListHeight = Math.min(stageSteps.length, 3) * 30
  return Math.max(baseHeight, baseHeight + stepListHeight)
}

/**
 * Custom layout for workflow: stages vertically, steps horizontally to the right
 * This ensures steps are always positioned to the right of their parent stage with short distance
 */
export const getWorkflowLayout = (nodes, edges) => {
  const positionedNodes = []
  const nodeMap = new Map()
  const stepToStageMap = new Map() // Maps step node ID to its parent stage node ID
  
  // First pass: create node map and identify relationships
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node })
    
    // Identify step-to-stage relationships from edges
    if (node.type === 'stepNode') {
      edges.forEach((edge) => {
        if (edge.target === node.id && edge.source.startsWith('stage-')) {
          stepToStageMap.set(node.id, edge.source)
        }
      })
    }
  })

  // Layout constants - configurable spacing
  const STAGE_STEP_DISTANCE = 50 // Short distance between stage and steps
  const STEP_HORIZONTAL_SPACING = 250 // Increased spacing between sequential step groups (for longer arrows)
  const STEP_VERTICAL_SPACING = 230 // Increased spacing between parallel steps (for better visual separation)
  const STAGE_VERTICAL_SPACING = 250 // Reduced spacing between stages (shorter height)
  const START_STAGE_SPACING = 150 // Reduced spacing between start node and first stage
  const STAGE_END_SPACING = 10 // Reduced spacing between last stage and end node
  const CENTER_X = 400 // Center X for stages
  const START_Y = 100

  // Find start, end, and stage nodes
  const startNode = nodeMap.get('start')
  const endNode = nodeMap.get('end')
  const stageNodes = Array.from(nodeMap.values()).filter(n => n.type === 'stageNode')
    .sort((a, b) => {
      const orderA = a.data?.stage?.order || 0
      const orderB = b.data?.stage?.order || 0
      return orderA - orderB
    })

  // Position start node
  if (startNode) {
    const width = NODE_DIMENSIONS.startNode.width
    positionedNodes.push({
      ...startNode,
      position: { x: CENTER_X - width / 2, y: START_Y },
      width: NODE_DIMENSIONS.startNode.width,
      height: NODE_DIMENSIONS.startNode.height,
    })
  }

  // Position stages and their steps
  let currentY = START_Y + (startNode ? NODE_DIMENSIONS.startNode.height + START_STAGE_SPACING : 0) // Space after start node

  stageNodes.forEach((stageNode) => {
    const stageId = stageNode.id
    const stage = stageNode.data?.stage
    const stageSteps = stage?.steps || []
    
    // Calculate stage node dimensions
    const stageWidth = NODE_DIMENSIONS.stageNode.width
    const stageHeight = getStageNodeHeight(stage || {})
    
    // Position stage node (centered horizontally)
    positionedNodes.push({
      ...stageNode,
      position: { x: CENTER_X - stageWidth / 2, y: currentY },
      width: stageWidth,
      height: stageHeight,
    })

    // Position steps to the right of the stage
    if (stageSteps.length > 0) {
      // Sort steps by order
      const sortedSteps = [...stageSteps].sort((a, b) => (a.order || 0) - (b.order || 0))
      
      // Group steps by order
      const stepsByOrder = {}
      sortedSteps.forEach((step) => {
        const order = step.order || 1
        if (!stepsByOrder[order]) {
          stepsByOrder[order] = []
        }
        stepsByOrder[order].push(step)
      })

      const orders = Object.keys(stepsByOrder).sort((a, b) => parseInt(a) - parseInt(b))
      const stepWidth = NODE_DIMENSIONS.stepNode.width
      const stepHeight = NODE_DIMENSIONS.stepNode.height
      
      // Calculate step X position (right side of stage with short distance)
      const stepStartX = CENTER_X + stageWidth / 2 + STAGE_STEP_DISTANCE
      
      // Calculate step Y position (center vertically with stage)
      const stageCenterY = currentY + stageHeight / 2
      const baseStepY = stageCenterY - stepHeight / 2

      let stepX = stepStartX
      let maxStepY = currentY

      orders.forEach((order) => {
        const parallelSteps = stepsByOrder[order]
        const stepCount = parallelSteps.length

        // Calculate vertical positioning for parallel steps with improved centering
        let stepY = baseStepY
        if (stepCount > 1) {
          // Center parallel steps vertically around stage center
          // Calculate total height including all steps and spacing
          const totalHeight = (stepCount - 1) * STEP_VERTICAL_SPACING + stepHeight
          // Start from the top of the centered group
          stepY = stageCenterY - totalHeight / 2
        }

        parallelSteps.forEach((step, stepIndex) => {
          const stepNode = nodeMap.get(`step-${step.id}`)
          if (stepNode) {
            // Calculate Y position: start from stepY and add spacing for each step
            const finalStepY = stepCount > 1 
              ? stepY + (stepIndex * STEP_VERTICAL_SPACING)
              : stepY
            
            positionedNodes.push({
              ...stepNode,
              position: { x: stepX, y: finalStepY },
              width: stepWidth,
              height: stepHeight,
            })
            
            maxStepY = Math.max(maxStepY, finalStepY + stepHeight)
          }
        })

        // Move X position for next order (sequential steps)
        stepX += STEP_HORIZONTAL_SPACING
      })

      // Update currentY to account for steps extending below stage
      const stageBottom = currentY + stageHeight
      currentY = Math.max(stageBottom, maxStepY) + STAGE_VERTICAL_SPACING
    } else {
      // No steps, just move to next stage
      currentY += stageHeight + STAGE_VERTICAL_SPACING
    }
  })

  // Position end node
  if (endNode) {
    const width = NODE_DIMENSIONS.endNode.width
    // Add spacing before end node
    const endY = currentY + STAGE_END_SPACING
    positionedNodes.push({
      ...endNode,
      position: { x: CENTER_X - width / 2, y: endY },
      width: NODE_DIMENSIONS.endNode.width,
      height: NODE_DIMENSIONS.endNode.height,
    })
  }

  return {
    nodes: positionedNodes,
    edges,
  }
}

/**
 * Apply Dagre layout to workflow nodes and edges (fallback for non-stage workflows)
 * @param {Array} nodes - ReactFlow nodes array
 * @param {Array} edges - ReactFlow edges array
 * @param {Object} options - Layout options
 * @returns {Object} - { nodes: Array, edges: Array } with computed positions
 */
export const getLayoutedElements = (nodes, edges, options = {}) => {
  // Check if this is a stage-based workflow
  const hasStages = nodes.some(n => n.type === 'stageNode')
  
  if (hasStages) {
    // Use custom layout for stage-based workflows
    return getWorkflowLayout(nodes, edges)
  }

  // Fallback to Dagre for step-only workflows
  const {
    direction = 'TB', // Top to Bottom
    nodeWidth = 280,
    nodeHeight = 140,
    nodeSpacing = { horizontal: 200, vertical: 150 },
  } = options

  // Create a new Dagre graph
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing.horizontal,
    ranksep: nodeSpacing.vertical,
    align: 'UL', // Align nodes to upper left
    acyclicer: 'greedy',
    ranker: 'tight-tree',
  })

  // Add nodes to the graph with their dimensions
  nodes.forEach((node) => {
    const nodeType = node.type || 'default'
    let width = nodeWidth
    let height = nodeHeight

    // Use explicit dimensions based on node type
    if (nodeType === 'startNode' || nodeType === 'endNode') {
      width = NODE_DIMENSIONS[nodeType].width
      height = NODE_DIMENSIONS[nodeType].height
    } else if (nodeType === 'stageNode') {
      width = NODE_DIMENSIONS.stageNode.width
      // Calculate height based on stage content
      if (node.data?.stage) {
        height = getStageNodeHeight(node.data.stage)
      } else {
        height = NODE_DIMENSIONS.stageNode.height
      }
    } else if (nodeType === 'stepNode') {
      width = NODE_DIMENSIONS.stepNode.width
      height = NODE_DIMENSIONS.stepNode.height
    }

    // Store dimensions in node data for ReactFlow
    dagreGraph.setNode(node.id, {
      width,
      height,
    })
  })

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run Dagre layout algorithm
  dagre.layout(dagreGraph)

  // Update node positions with computed layout
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    
    // Handle case where node might not be in graph (shouldn't happen, but safety check)
    if (!nodeWithPosition) {
      console.warn(`Node ${node.id} not found in layout graph`)
      return node
    }
    
    return {
      ...node,
      // Position nodes with their top-left corner at the computed position
      // Dagre returns center positions, so we offset by half width/height
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
      // Store dimensions for reference
      width: nodeWithPosition.width,
      height: nodeWithPosition.height,
    }
  })

  return {
    nodes: layoutedNodes,
    edges,
  }
}

/**
 * Layout configuration for workflow stages (vertical flow with horizontal step branches)
 */
export const WORKFLOW_LAYOUT_CONFIG = {
  direction: 'TB', // Top to Bottom for main flow
  nodeSpacing: {
    horizontal: 250, // Spacing between parallel nodes
    vertical: 200,   // Spacing between sequential nodes
  },
}
