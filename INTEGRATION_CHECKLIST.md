# Quick Integration Checklist

Use this checklist to integrate the workflow layout engine into another application.

## Files to Copy

- [ ] Copy `src/utils/workflowLayout.js` to your application
- [ ] Copy `src/utils/workflowMapper.js` to your application

## Dependencies to Install

- [ ] Install `dagre`: `npm install dagre`
- [ ] (Optional) Install `reactflow` if using ReactFlow: `npm install reactflow`

## Code Integration

- [ ] Import layout functions in your component:
  ```javascript
  import { stagesToNodes, stagesToEdges } from './utils/workflowMapper'
  import { getLayoutedElements, WORKFLOW_LAYOUT_CONFIG } from './utils/workflowLayout'
  ```

- [ ] Convert workflow to nodes/edges:
  ```javascript
  const flowNodes = stagesToNodes(workflow.stages, workflow.name)
  const flowEdges = stagesToEdges(workflow.stages)
  ```

- [ ] Apply layout engine:
  ```javascript
  const { nodes, edges } = getLayoutedElements(
    flowNodes,
    flowEdges,
    WORKFLOW_LAYOUT_CONFIG
  )
  ```

- [ ] Merge with saved positions (if available):
  ```javascript
  const finalNodes = nodes.map(node => ({
    ...node,
    position: workflow?.visualStructure?.positions?.[node.id] || node.position
  }))
  ```

## Testing

- [ ] Test with workflow that has `visualStructure` (should use saved positions)
- [ ] Test with workflow that has `null` visualStructure (should compute positions)
- [ ] Test with workflow that has no stages (should handle gracefully)
- [ ] Verify nodes are positioned correctly
- [ ] Verify edges connect properly

## Common Issues

- [ ] If "dagre is not defined": Run `npm install dagre`
- [ ] If nodes overlap: Check node dimensions in `NODE_DIMENSIONS`
- [ ] If positions are wrong: Verify you're using `getLayoutedElements` result
- [ ] If saved positions not used: Check merge logic with `visualStructure.positions`

## Priority Logic

Remember: Saved positions > Computed positions

```javascript
// Always use this pattern:
position: workflow?.visualStructure?.positions?.[node.id] || node.position
```

This ensures:
1. If API has saved positions → use them
2. If API has null/missing → use computed positions from layout engine
