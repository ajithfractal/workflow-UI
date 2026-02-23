/**
 * Maps backend DTOs to UI models and vice versa
 */

/**
 * Convert backend StageDefinitionResponse to UI stage model
 */
export const mapStageToUI = (backendStage) => {
  if (!backendStage) return null

  return {
    id: backendStage.stageId,
    name: backendStage.stageName,
    order: backendStage.stageOrder,
    stepCompletionType: backendStage.stepCompletionType,
    minStepCompletions: backendStage.minStepCompletions,
    steps: backendStage.steps?.map(mapStepToUI) || [],
  }
}

/**
 * Convert backend WorkflowDefinitionResponse to UI workflow model
 */
export const mapWorkflowToUI = (backendWorkflow) => {
  if (!backendWorkflow) return null

  return {
    id: backendWorkflow.workflowId,
    name: backendWorkflow.name,
    version: backendWorkflow.version,
    isActive: backendWorkflow.isActive,
    stages: backendWorkflow.stages?.map(mapStageToUI) || [],
    // Legacy support: flatten stages to steps for backward compatibility
    steps: backendWorkflow.stages?.flatMap(stage => stage.steps?.map(mapStepToUI) || []) || [],
    // Visual structure for diagram layout (node positions, etc.)
    visualStructure: backendWorkflow.visualStructure || null,
  }
}

/**
 * Convert backend StepDefinitionResponse to UI step model
 */
export const mapStepToUI = (backendStep) => {
  return {
    id: backendStep.stepId,
    name: backendStep.stepName,
    order: backendStep.stepOrder,
    approvalType: backendStep.approvalType,
    minApprovals: backendStep.minApprovals,
    slaHours: backendStep.slaHours,
    approvers: backendStep.approvers?.map(mapApproverToUI) || [],
  }
}

/**
 * Convert backend ApproverResponse to UI approver model
 */
export const mapApproverToUI = (backendApprover) => {
  return {
    id: backendApprover.approverId,
    type: backendApprover.approverType,
    value: backendApprover.approverValue,
  }
}

/**
 * Convert UI step model to backend StepDefinitionRequest
 */
export const mapStepToBackend = (uiStep) => {
  const stepData = {
    stepName: uiStep.name,
    stepOrder: uiStep.order,
    approvalType: uiStep.approvalType,
    minApprovals: uiStep.minApprovals,
    slaHours: uiStep.slaHours,
  }
  
  // Include approvers if provided (for step creation)
  if (uiStep.approvers && Array.isArray(uiStep.approvers) && uiStep.approvers.length > 0) {
    stepData.approvers = uiStep.approvers.map(approver => ({
      approverType: approver.type || approver.approverType,
      approverValue: approver.value || approver.approverValue,
    }))
  }
  
  return stepData
}

/**
 * Convert UI approver model to backend ApproverRequest
 */
export const mapApproverToBackend = (uiApprover) => {
  return {
    approverType: uiApprover.type,
    approverValue: uiApprover.value,
  }
}

/**
 * Convert UI stage model to backend StageDefinitionRequest
 */
export const mapStageToBackend = (uiStage) => {
  const stageData = {
    stageName: uiStage.name,
    stageOrder: uiStage.order,
    stepCompletionType: uiStage.stepCompletionType,
  }
  
  // Include minStepCompletions only if stepCompletionType is N_OF_M
  if (uiStage.stepCompletionType === 'N_OF_M' && uiStage.minStepCompletions !== undefined) {
    stageData.minStepCompletions = uiStage.minStepCompletions
  }
  
  // Include steps if provided (for stage creation with steps)
  if (uiStage.steps && Array.isArray(uiStage.steps) && uiStage.steps.length > 0) {
    stageData.steps = uiStage.steps.map(mapStepToBackend)
  }
  
  return stageData
}

/**
 * Convert workflow stages to React Flow nodes (without positions - layout engine will compute them)
 * Positions will be computed by the layout engine based on edges
 */
export const stagesToNodes = (stages = [], workflowName = 'Workflow') => {
  const nodes = []
  
  // Start node
  nodes.push({
    id: 'start',
    type: 'startNode',
    position: { x: 0, y: 0 }, // Temporary position, will be computed by layout engine
    data: { label: 'SUBMITTED' },
  })

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0))

  sortedStages.forEach((stage) => {
    const stageSteps = stage.steps || []
    
    // Create stage node
    nodes.push({
      id: `stage-${stage.id}`,
      type: 'stageNode',
      position: { x: 0, y: 0 }, // Temporary position, will be computed by layout engine
      data: {
        label: stage.name,
        stage: stage,
        steps: stageSteps,
        customBorderColor: stage.borderColor || null,
        customBackgroundColor: stage.backgroundColor || null,
      },
    })

    // Create step nodes
    if (stageSteps.length > 0) {
      // Sort steps by order
      const sortedSteps = [...stageSteps].sort((a, b) => (a.order || 0) - (b.order || 0))
      
      // Group steps by order to identify parallel vs sequential
      const stepsByOrder = {}
      sortedSteps.forEach((step) => {
        const order = step.order || 1
        if (!stepsByOrder[order]) {
          stepsByOrder[order] = []
        }
        stepsByOrder[order].push(step)
      })

      const orders = Object.keys(stepsByOrder).sort((a, b) => parseInt(a) - parseInt(b))

      orders.forEach((order) => {
        const parallelSteps = stepsByOrder[order]
        const stepCount = parallelSteps.length

        parallelSteps.forEach((step) => {
          nodes.push({
            id: `step-${step.id}`,
            type: 'stepNode',
            position: { x: 0, y: 0 }, // Temporary position, will be computed by layout engine
            data: {
              label: step.name,
              step: step,
              order: step.order,
              isParallel: stepCount > 1,
              parallelGroupSize: stepCount,
              parentStageId: stage.id,
              stageOrder: stage.order,
              customBorderColor: step.borderColor || null,
              customBackgroundColor: step.backgroundColor || null,
            },
          })
        })
      })
    }
  })

  // End node
  nodes.push({
    id: 'end',
    type: 'endNode',
    position: { x: 0, y: 0 }, // Temporary position, will be computed by layout engine
    data: { label: 'COMPLETED' },
  })

  return nodes
}

/**
 * Convert workflow steps to React Flow nodes (legacy - for backward compatibility)
 */
export const stepsToNodes = (steps, workflowName = 'Workflow') => {
  const nodes = []
  const nodeWidth = 200
  const nodeHeight = 100
  const horizontalSpacing = 250
  const verticalSpacing = 150
  const startY = 50

  // Start node
  nodes.push({
    id: 'start',
    type: 'startNode',
    position: { x: 400, y: startY },
    data: { label: 'SUBMITTED' },
  })

  // Group steps by order
  const stepsByOrder = {}
  steps.forEach((step) => {
    if (!stepsByOrder[step.order]) {
      stepsByOrder[step.order] = []
    }
    stepsByOrder[step.order].push(step)
  })

  // Create step nodes
  const orders = Object.keys(stepsByOrder).sort((a, b) => parseInt(a) - parseInt(b))
  let currentY = startY + verticalSpacing

  orders.forEach((order) => {
    const parallelSteps = stepsByOrder[order]
    const stepCount = parallelSteps.length
    
    // Calculate positions for parallel steps
    // Center all steps around x=400
    let startX
    if (stepCount === 1) {
      // Single step: center it
      startX = 400 - nodeWidth / 2
    } else {
      // Multiple parallel steps: distribute them horizontally
      // Total width = spacing between nodes + width of last node
      const totalWidth = (stepCount - 1) * horizontalSpacing + nodeWidth
      // Start from left edge, centered around x=400
      startX = 400 - totalWidth / 2
    }

    parallelSteps.forEach((step, index) => {
      nodes.push({
        id: `step-${step.id}`,
        type: 'stepNode',
        position: {
          x: startX + index * horizontalSpacing,
          y: currentY,
        },
        data: {
          label: step.name,
          step: step,
          order: step.order,
          isParallel: stepCount > 1,
          parallelGroupSize: stepCount,
        },
      })
    })

    currentY += verticalSpacing
  })

  // End node
  nodes.push({
    id: 'end',
    type: 'endNode',
    position: { x: 400, y: currentY },
    data: { label: 'COMPLETED' },
  })

  return nodes
}

/**
 * Convert workflow stages to React Flow edges (stages vertically, steps horizontally)
 */
export const stagesToEdges = (stages = []) => {
  const edges = []
  
  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0))

  // Edge from start to first stage
  if (sortedStages.length > 0) {
    const firstStage = sortedStages[0]
    edges.push({
      id: 'start-stage-0',
      source: 'start',
      target: `stage-${firstStage.id}`,
      targetHandle: 'top', // Connect to top handle of stage
      type: 'smoothstep',
      markerEnd: {
        type: 'arrowclosed',
        color: '#64b5f6', // Lighter blue for better dark mode visibility
      },
      style: { strokeWidth: 3, stroke: '#64b5f6' },
    })
  }

  // Process each stage: connect stage to its steps, and steps within stage
  sortedStages.forEach((stage) => {
    const stageSteps = stage.steps || []
    
    if (stageSteps.length > 0) {
      // Group steps by order
      const stepsByOrder = {}
      stageSteps.forEach((step) => {
        const order = step.order || 1
        if (!stepsByOrder[order]) {
          stepsByOrder[order] = []
        }
        stepsByOrder[order].push(step)
      })

      const orders = Object.keys(stepsByOrder).sort((a, b) => parseInt(a) - parseInt(b))
      const firstOrderSteps = stepsByOrder[orders[0]]

      // Connect stage to first order steps (horizontal branch from right side)
      firstOrderSteps.forEach((step) => {
        edges.push({
          id: `stage-${stage.id}-step-${step.id}`,
          source: `stage-${stage.id}`,
          sourceHandle: 'right', // Connect from right handle of stage
          target: `step-${step.id}`,
          type: 'smoothstep',
          markerEnd: {
            type: 'arrowclosed',
            color: '#64b5f6', // Lighter blue for better dark mode visibility
          },
          style: { strokeWidth: 2, stroke: '#64b5f6' },
        })
      })

      // Connect steps within stage (sequential flow)
      // Only connect steps in sequence, not all-to-all to avoid messy connections
      for (let i = 0; i < orders.length - 1; i++) {
        const currentOrder = orders[i]
        const nextOrder = orders[i + 1]
        const currentSteps = stepsByOrder[currentOrder]
        const nextSteps = stepsByOrder[nextOrder]

        // For cleaner visualization: connect each current step to the next step(s)
        // If parallel steps, connect to all next steps
        // If sequential, connect in order
        if (currentSteps.length === 1 && nextSteps.length === 1) {
          // Simple sequential connection
          edges.push({
            id: `step-${currentSteps[0].id}-step-${nextSteps[0].id}`,
            source: `step-${currentSteps[0].id}`,
            target: `step-${nextSteps[0].id}`,
            type: 'smoothstep',
            markerEnd: {
              type: 'arrowclosed',
              color: '#64b5f6',
            },
            style: { strokeWidth: 2, stroke: '#64b5f6' },
          })
        } else {
          // Parallel or mixed: connect all current to all next (for workflow flexibility)
          currentSteps.forEach((currentStep) => {
            nextSteps.forEach((nextStep) => {
              edges.push({
                id: `step-${currentStep.id}-step-${nextStep.id}`,
                source: `step-${currentStep.id}`,
                target: `step-${nextStep.id}`,
                type: 'smoothstep',
                markerEnd: {
                  type: 'arrowclosed',
                  color: '#64b5f6',
                },
                style: { strokeWidth: 2, stroke: '#64b5f6' },
              })
            })
          })
        }
      }
    }
  })

  // Edges between stages (main vertical flow)
  for (let i = 0; i < sortedStages.length - 1; i++) {
    const currentStage = sortedStages[i]
    const nextStage = sortedStages[i + 1]
    
    // Connect current stage to next stage (main flow)
    edges.push({
      id: `stage-${currentStage.id}-stage-${nextStage.id}`,
      source: `stage-${currentStage.id}`,
      sourceHandle: 'bottom', // Connect from bottom handle of current stage
      target: `stage-${nextStage.id}`,
      targetHandle: 'top', // Connect to top handle of next stage
      type: 'smoothstep',
      markerEnd: {
        type: 'arrowclosed',
        color: '#64b5f6', // Lighter blue for better dark mode visibility
      },
      style: { strokeWidth: 3, stroke: '#64b5f6' },
    })
  }

  // Edge from last stage to end
  if (sortedStages.length > 0) {
    const lastStage = sortedStages[sortedStages.length - 1]
    edges.push({
      id: `stage-${lastStage.id}-end`,
      source: `stage-${lastStage.id}`,
      sourceHandle: 'bottom', // Connect from bottom handle of last stage
      target: 'end',
      type: 'smoothstep',
      markerEnd: {
        type: 'arrowclosed',
        color: '#64b5f6', // Lighter blue for better dark mode visibility
      },
      style: { strokeWidth: 3, stroke: '#64b5f6' },
    })
  }

  return edges
}

/**
 * Convert workflow steps to React Flow edges (legacy - for backward compatibility)
 */
export const stepsToEdges = (steps) => {
  const edges = []
  const orders = [...new Set(steps.map((s) => s.order))].sort((a, b) => a - b)

  // Edge from start to first order steps
  if (orders.length > 0) {
    const firstOrderSteps = steps.filter((s) => s.order === orders[0])
    firstOrderSteps.forEach((step) => {
      edges.push({
        id: `start-step-${step.id}`,
        source: 'start',
        target: `step-${step.id}`,
        type: 'smoothstep',
        markerEnd: {
          type: 'arrowclosed',
          color: '#3b82f6',
        },
        style: { strokeWidth: 2, stroke: '#3b82f6' },
      })
    })
  }

  // Edges between step orders
  for (let i = 0; i < orders.length - 1; i++) {
    const currentOrder = orders[i]
    const nextOrder = orders[i + 1]
    const currentSteps = steps.filter((s) => s.order === currentOrder)
    const nextSteps = steps.filter((s) => s.order === nextOrder)

    // Connect all current steps to all next steps (for parallel aggregation)
    currentSteps.forEach((currentStep) => {
      nextSteps.forEach((nextStep) => {
        edges.push({
          id: `step-${currentStep.id}-step-${nextStep.id}`,
          source: `step-${currentStep.id}`,
          target: `step-${nextStep.id}`,
          type: 'smoothstep',
          markerEnd: {
            type: 'arrowclosed',
            color: '#3b82f6',
          },
          style: { strokeWidth: 2, stroke: '#3b82f6' },
        })
      })
    })
  }

  // Edge from last order steps to end
  if (orders.length > 0) {
    const lastOrder = orders[orders.length - 1]
    const lastOrderSteps = steps.filter((s) => s.order === lastOrder)
    lastOrderSteps.forEach((step) => {
      edges.push({
        id: `step-${step.id}-end`,
        source: `step-${step.id}`,
        target: 'end',
        type: 'smoothstep',
        markerEnd: {
          type: 'arrowclosed',
          color: '#3b82f6',
        },
        style: { strokeWidth: 2, stroke: '#3b82f6' },
      })
    })
  }

  return edges
}

/**
 * Get all steps from workflow stages (flatten stages to steps)
 */
export const getAllStepsFromStages = (workflow) => {
  if (!workflow) return []
  if (workflow.steps && Array.isArray(workflow.steps)) {
    // Legacy support: if steps already exist, return them
    return workflow.steps
  }
  if (workflow.stages && Array.isArray(workflow.stages)) {
    // New structure: flatten stages to get all steps
    return workflow.stages.flatMap(stage => stage.steps || [])
  }
  return []
}

/**
 * Convert step instances (from work item response) to step definitions format
 * Step instances have: stepId, stepName, stepOrder, status
 * Step definitions have: id, name, order
 */
export const stepInstancesToStepDefinitions = (stepInstances) => {
  if (!Array.isArray(stepInstances)) return []
  
  return stepInstances.map((stepInstance) => ({
    id: stepInstance.stepId,
    name: stepInstance.stepName,
    order: stepInstance.stepOrder,
    status: stepInstance.status, // COMPLETED, IN_PROGRESS, NOT_STARTED
    stepInstance: stepInstance, // Keep reference to original step instance
  }))
}
