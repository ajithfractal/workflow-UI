/**
 * Maps backend DTOs to UI models and vice versa
 */

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
    steps: backendWorkflow.steps?.map(mapStepToUI) || [],
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
  return {
    stepName: uiStep.name,
    stepOrder: uiStep.order,
    approvalType: uiStep.approvalType,
    minApprovals: uiStep.minApprovals,
    slaHours: uiStep.slaHours,
  }
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
 * Convert workflow steps to React Flow nodes
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
    const totalWidth = stepCount * horizontalSpacing
    const startX = 400 - (totalWidth - nodeWidth) / 2

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
 * Convert workflow steps to React Flow edges
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
      })
    })
  }

  return edges
}
