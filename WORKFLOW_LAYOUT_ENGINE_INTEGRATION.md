# Workflow Layout Engine Integration Guide

This guide explains how to integrate the workflow layout engine into another frontend application so it can properly display workflows even when `visualStructure` is null or missing.

## Overview

The layout engine automatically computes node positions for workflow diagrams when `visualStructure` is not available from the API. This ensures consistent visualization across all applications.

## Required Files

Copy these files to your application:

1. **`src/utils/workflowLayout.js`** - Main layout engine
2. **`src/utils/workflowMapper.js`** - Workflow data transformation utilities

## Dependencies

Install the following npm packages:

```bash
npm install dagre
```

**Note**: If you're using ReactFlow for visualization, you'll also need:
```bash
npm install reactflow
```

## Integration Steps

### Step 1: Copy Utility Files

Copy the following files to your application:

```
your-app/
└── src/
    └── utils/
        ├── workflowLayout.js
        └── workflowMapper.js
```

### Step 2: Install Dependencies

```bash
npm install dagre
```

### Step 3: Import and Use in Your Component

Here's a complete example of how to use the layout engine:

```javascript
import { useEffect, useState } from 'react'
import { stagesToNodes, stagesToEdges } from './utils/workflowMapper'
import { getLayoutedElements, WORKFLOW_LAYOUT_CONFIG } from './utils/workflowLayout'

function YourWorkflowComponent({ workflow }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  useEffect(() => {
    if (!workflow?.stages || workflow.stages.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    // Step 1: Convert workflow stages to ReactFlow nodes/edges
    const flowNodes = stagesToNodes(workflow.stages, workflow.name)
    const flowEdges = stagesToEdges(workflow.stages)

    // Step 2: Apply layout engine to compute positions
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      flowNodes,
      flowEdges,
      WORKFLOW_LAYOUT_CONFIG
    )

    // Step 3: Apply visualStructure positions if available, otherwise use computed positions
    const finalNodes = layoutedNodes.map(node => {
      const savedPosition = workflow?.visualStructure?.positions?.[node.id]
      return {
        ...node,
        position: savedPosition || node.position, // Use saved position or computed position
      }
    })

    setNodes(finalNodes)
    setEdges(layoutedEdges)
  }, [workflow])

  // Render your diagram using ReactFlow or your visualization library
  return (
    <div>
      {/* Your diagram rendering code */}
    </div>
  )
}
```

## API Usage Pattern

The layout engine works with this pattern:

```javascript
// 1. Get workflow from API
const workflow = await fetchWorkflow(workflowId)

// 2. Convert to nodes/edges
const flowNodes = stagesToNodes(workflow.stages, workflow.name)
const flowEdges = stagesToEdges(workflow.stages)

// 3. Apply layout (computes positions automatically)
const { nodes, edges } = getLayoutedElements(
  flowNodes,
  flowEdges,
  WORKFLOW_LAYOUT_CONFIG
)

// 4. Override with saved positions if available
const finalNodes = nodes.map(node => ({
  ...node,
  position: workflow?.visualStructure?.positions?.[node.id] || node.position
}))
```

## Key Functions

### `getLayoutedElements(nodes, edges, options)`

Main layout function that computes node positions.

**Parameters:**
- `nodes` (Array): ReactFlow nodes array (without positions or with {x: 0, y: 0})
- `edges` (Array): ReactFlow edges array
- `options` (Object): Layout configuration (use `WORKFLOW_LAYOUT_CONFIG`)

**Returns:**
```javascript
{
  nodes: Array, // Nodes with computed positions
  edges: Array  // Edges (unchanged)
}
```

### `stagesToNodes(stages, workflowName)`

Converts workflow stages to ReactFlow nodes.

**Parameters:**
- `stages` (Array): Workflow stages from API
- `workflowName` (String): Workflow name

**Returns:** Array of ReactFlow nodes

### `stagesToEdges(stages)`

Converts workflow stages to ReactFlow edges.

**Parameters:**
- `stages` (Array): Workflow stages from API

**Returns:** Array of ReactFlow edges

## Layout Configuration

The default configuration is exported as `WORKFLOW_LAYOUT_CONFIG`:

```javascript
import { WORKFLOW_LAYOUT_CONFIG } from './utils/workflowLayout'

// Use default config
const { nodes, edges } = getLayoutedElements(flowNodes, flowEdges, WORKFLOW_LAYOUT_CONFIG)
```

You can also customize the layout:

```javascript
const customConfig = {
  direction: 'TB', // Top to Bottom
  nodeSpacing: {
    horizontal: 250,
    vertical: 200,
  },
}

const { nodes, edges } = getLayoutedElements(flowNodes, flowEdges, customConfig)
```

## Node Types

The layout engine supports these node types:

- `startNode` - Workflow start (SUBMITTED)
- `endNode` - Workflow end (COMPLETED)
- `stageNode` - Workflow stage
- `stepNode` - Individual step

## Layout Behavior

### Stage-Based Workflows

For workflows with stages:
- Stages are positioned **vertically** (top to bottom)
- Steps branch **horizontally** to the right of their parent stage
- Parallel steps (same order) are positioned side by side
- Sequential steps are positioned with spacing

### Legacy Step-Only Workflows

For workflows without stages (legacy):
- Uses Dagre layout algorithm
- Steps are positioned in a hierarchical flow

## Example: Complete Integration

```javascript
import React, { useEffect, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'
import { stagesToNodes, stagesToEdges } from './utils/workflowMapper'
import { getLayoutedElements, WORKFLOW_LAYOUT_CONFIG } from './utils/workflowLayout'

function WorkflowDiagram({ workflowId }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [workflow, setWorkflow] = useState(null)

  // Fetch workflow from API
  useEffect(() => {
    fetch(`/api/workflow-definitions/${workflowId}`)
      .then(res => res.json())
      .then(data => setWorkflow(data))
  }, [workflowId])

  // Apply layout when workflow changes
  useEffect(() => {
    if (!workflow?.stages || workflow.stages.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    // Convert to nodes/edges
    const flowNodes = stagesToNodes(workflow.stages, workflow.name)
    const flowEdges = stagesToEdges(workflow.stages)

    // Apply layout engine
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      flowNodes,
      flowEdges,
      WORKFLOW_LAYOUT_CONFIG
    )

    // Merge with saved positions if available
    const finalNodes = layoutedNodes.map(node => ({
      ...node,
      position: workflow?.visualStructure?.positions?.[node.id] || node.position,
    }))

    setNodes(finalNodes)
    setEdges(layoutedEdges)
  }, [workflow])

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

export default WorkflowDiagram
```

## Troubleshooting

### Issue: Nodes are not positioned correctly

**Solution**: Ensure you're using the layout engine:
```javascript
const { nodes, edges } = getLayoutedElements(flowNodes, flowEdges, WORKFLOW_LAYOUT_CONFIG)
```

### Issue: "dagre is not defined"

**Solution**: Install dagre:
```bash
npm install dagre
```

### Issue: Nodes overlap

**Solution**: Check that node dimensions match your node components. Update `NODE_DIMENSIONS` in `workflowLayout.js` if needed.

### Issue: Visual structure from API is not being used

**Solution**: Ensure you merge saved positions after layout:
```javascript
const finalNodes = layoutedNodes.map(node => ({
  ...node,
  position: workflow?.visualStructure?.positions?.[node.id] || node.position,
}))
```

## Priority Order

The layout engine uses this priority:

1. **Saved positions** from `workflow.visualStructure.positions[nodeId]` (if available)
2. **Computed positions** from layout engine (fallback)

This ensures:
- If API has `visualStructure`, use it (user-customized layout)
- If API has `null` or missing `visualStructure`, compute automatically (consistent default layout)

## Benefits

1. **Consistent Layout**: All applications show the same default layout
2. **No Manual Positioning**: Automatic positioning when `visualStructure` is null
3. **Flexible**: Can override with saved positions when available
4. **Reusable**: Same layout logic across all applications

## Support

For issues or questions:
1. Check that all dependencies are installed
2. Verify file paths are correct
3. Ensure workflow data structure matches expected format
4. Check browser console for errors
