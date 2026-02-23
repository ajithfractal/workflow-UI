import { useEffect, useCallback, useMemo, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Box, Alert, Typography, Fade, Button, Stack, Accordion, AccordionSummary, AccordionDetails, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormHelperText } from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { useWorkflow, useCreateWorkflow, useUpdateWorkflow, useUpdateWorkflowVisualStructure, useWorkflows } from '../../hooks/queries/useWorkflows'
import { useWorkItems } from '../../hooks/queries/useWorkItems'
import useWorkflowStore from '../../hooks/useWorkflow'
import { useModal } from '../../hooks/useModal'
import { stagesToNodes, stagesToEdges, stepsToNodes, stepsToEdges, getAllStepsFromStages } from '../../utils/workflowMapper'
import { getLayoutedElements, WORKFLOW_LAYOUT_CONFIG } from '../../utils/workflowLayout'
import StartNode from './NodeTypes/StartNode'
import StepNode from './NodeTypes/StepNode'
import StageNode from './NodeTypes/StageNode'
import EndNode from './NodeTypes/EndNode'
import StepForm from '../StepForm/StepForm'
import StageForm from '../StageForm/StageForm'
import Toolbar from './Toolbar'
import Loader from '../Loader/Loader'
import Modal from '../Modal/Modal'

function WorkflowDesigner({ workflowId, onBack, onCreateWorkItem, onNavigateToWorkflow }) {
  const nodeTypes = useMemo(() => ({
    startNode: StartNode,
    stepNode: StepNode,
    stageNode: StageNode,
    endNode: EndNode,
  }), [])
  // Use React Query for data fetching
  const { data: workflow, isLoading, error } = useWorkflow(workflowId)
  const { data: allWorkflows = [] } = useWorkflows()
  const { data: workItemsForWorkflow = [], isLoading: isLoadingWorkItems } = useWorkItems(workflowId)
  const createWorkflowMutation = useCreateWorkflow()
  const updateWorkflowMutation = useUpdateWorkflow()
  const updateVisualStructureMutation = useUpdateWorkflowVisualStructure()
  const { selectedStep, setSelectedStep } = useWorkflowStore()
  const { modal, showAlert, showConfirm, closeModal } = useModal()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showStepForm, setShowStepForm] = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const [selectedStage, setSelectedStage] = useState(null)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowVersion, setWorkflowVersion] = useState(1)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [colorPickerNode, setColorPickerNode] = useState(null)
  const [customColors, setCustomColors] = useState({}) // Store custom colors: { 'stage-{id}': { borderColor, backgroundColor }, 'step-{id}': { borderColor, backgroundColor } }
  const [visualPositions, setVisualPositions] = useState({}) // Store visual positions: { [nodeId]: { x, y } }

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

  // Load visual positions from workflow.visualStructure (backend) on mount
  useEffect(() => {
    if (workflow?.visualStructure) {
      try {
        // visualStructure should contain { positions: { [nodeId]: { x, y } } }
        const positions = workflow.visualStructure?.positions || {}
        setVisualPositions(positions)
      } catch (error) {
        console.error('Failed to load visual positions from workflow:', error)
        setVisualPositions({})
      }
    } else {
      // Clear visual positions when no workflow or no visual structure
      setVisualPositions({})
    }
  }, [workflow?.visualStructure, workflow?.id])

  // Update nodes/edges when workflow stages change
  useEffect(() => {
    if (workflow?.stages && workflow.stages.length > 0) {
      // Use stages-based visualization - get nodes and edges without positions
      const flowNodes = stagesToNodes(workflow.stages, workflow.name)
      const flowEdges = stagesToEdges(workflow.stages)
      
      // Apply layout engine to compute positions
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        flowNodes,
        flowEdges,
        WORKFLOW_LAYOUT_CONFIG
      )
      
      // Note: Visual structure will be saved when user clicks "Save Workflow" button
      // No auto-save - positions are tracked locally in visualPositions state
      
      // Apply custom colors and visual positions to nodes
      const nodesWithColorsAndPositions = layoutedNodes.map(node => {
        const nodeId = node.id
        const stateColor = customColors[nodeId]
        const workflowColor = node.data.customBorderColor || node.data.customBackgroundColor 
          ? {
              borderColor: node.data.customBorderColor,
              backgroundColor: node.data.customBackgroundColor,
            }
          : null
        
        // State colors take precedence over workflow colors
        const finalColor = stateColor || workflowColor
        
        // Apply visual position if it exists (user-dragged), otherwise use layout engine position
        const finalPosition = visualPositions[nodeId] || node.position
        
        const nodeWithColor = finalColor ? {
          ...node,
          data: {
            ...node.data,
            customBorderColor: finalColor.borderColor || null,
            customBackgroundColor: finalColor.backgroundColor || null,
          },
        } : node
        
        return {
          ...nodeWithColor,
          position: finalPosition,
        }
      })
      
      setNodes(nodesWithColorsAndPositions)
      setEdges(layoutedEdges)
    } else {
      // Fallback: if no stages but has steps (legacy), use step-based visualization
      const allSteps = getAllStepsFromStages(workflow)
      if (allSteps && allSteps.length > 0) {
        const flowNodes = stepsToNodes(allSteps, workflow.name)
        const flowEdges = stepsToEdges(allSteps)
        
        // Apply layout engine to compute positions
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          flowNodes,
          flowEdges,
          WORKFLOW_LAYOUT_CONFIG
        )
        
        // Note: Visual structure will be saved when user clicks "Save Workflow" button
        // No auto-save - positions are tracked locally in visualPositions state
        
        setNodes(layoutedNodes)
        setEdges(layoutedEdges)
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
    }
  }, [workflow?.stages, workflow?.steps, workflow?.name, customColors, visualPositions, setNodes, setEdges])

  const handleStageClick = (stage) => {
    if (isInUse) return
    setSelectedStage(stage)
    setShowStepForm(false)
    setShowStageForm(false)
  }

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'stageNode' && workflow) {
      // Clicking on a stage - select it and show its details
      const stage = workflow.stages?.find((s) => s.id === node.data.stage.id)
      if (stage) {
        setSelectedStage(stage)
        setShowStepForm(false)
        setShowStageForm(false)
      }
    } else if (node.type === 'stepNode' && workflow) {
      // Clicking on a step - show step form
      const allSteps = getAllStepsFromStages(workflow)
      const step = allSteps.find((s) => s.id === node.data.step.id)
      if (step) {
        // Find which stage contains this step
        const parentStage = workflow.stages?.find(stage => 
          stage.steps?.some(s => s.id === step.id)
        )
        setSelectedStep(step)
        setSelectedStage(parentStage)
        setShowStepForm(true)
        setShowStageForm(false)
      }
    }
  }, [workflow, setSelectedStep, isInUse])
  
  const onNodeDoubleClick = useCallback((event, node) => {
    // Double-click to open color picker
    if (!isInUse && (node.type === 'stageNode' || node.type === 'stepNode')) {
      event.preventDefault()
      setColorPickerNode(node)
      setColorPickerOpen(true)
    }
  }, [isInUse])

  // Handle node position changes (for visual rearrangement)
  const handleNodesChange = useCallback((changes) => {
    // Apply changes to ReactFlow's internal state
    onNodesChange(changes)
    
    // Track position changes for visual positions
    const updatedPositions = { ...visualPositions }
    let hasPositionChanges = false
    
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        updatedPositions[change.id] = change.position
        hasPositionChanges = true
      } else if (change.type === 'remove') {
        // Remove position when node is removed
        delete updatedPositions[change.id]
        hasPositionChanges = true
      }
    })
    
    // Update visual positions state immediately for UI responsiveness
    // Note: Visual structure will be saved when user clicks "Save Workflow" button
    if (hasPositionChanges && workflowId) {
      setVisualPositions(updatedPositions)
    }
  }, [onNodesChange, visualPositions, workflowId])
  
  const handleColorPickerClose = () => {
    setColorPickerOpen(false)
    setColorPickerNode(null)
  }
  
  const handleColorSave = (borderColor, backgroundColor) => {
    if (colorPickerNode) {
      setCustomColors(prev => ({
        ...prev,
        [colorPickerNode.id]: {
          borderColor: borderColor || null,
          backgroundColor: backgroundColor || null,
        },
      }))
      handleColorPickerClose()
    }
  }

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
      
      // Check if visual structure has changed (compare current positions with saved positions)
      const currentVisualStructure = {
        positions: visualPositions,
        lastUpdated: new Date().toISOString(),
      }
      const savedPositions = workflow?.visualStructure?.positions || {}
      const visualStructureChanged = JSON.stringify(visualPositions) !== JSON.stringify(savedPositions)

      if (!nameChanged && !versionChanged && !visualStructureChanged) {
        showAlert('No changes to save.', 'info', 'No Changes')
        return
      }

      try {
        // Update workflow with name, version, and visual structure
        await updateWorkflowMutation.mutateAsync({
          workflowId: workflow.id,
          updateData: {
            name: workflowName,
            version: workflowVersion,
            visualStructure: currentVisualStructure,
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
        // Create initial visualStructure with start/end node positions
        const initialVisualStructure = {
          positions: {
            start: { x: 400, y: 50 },
            end: { x: 400, y: 200 },
          },
          lastUpdated: new Date().toISOString(),
        }
        
        const response = await createWorkflowMutation.mutateAsync({
          name: workflowName,
          version: workflowVersion,
          visualStructure: initialVisualStructure,
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
            // Auto-open stage form after a brief moment so user can start adding stages
            setTimeout(() => {
              setSelectedStage(null)
              setShowStageForm(true)
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

  const handleAddStage = () => {
    if (isInUse) {
      showAlert(
        'This workflow definition is being used by work items. You cannot modify it. Please create a new version.',
        'warning',
        'Workflow Locked'
      )
      return
    }
    if (!workflow?.id) {
      showAlert('Please save the workflow first before adding stages', 'warning', 'Warning')
      return
    }
    setSelectedStage(null)
    setShowStageForm(true)
  }

  const handleAddStep = (stageId) => {
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
    if (!stageId) {
      showAlert('Please select a stage first', 'warning', 'Warning')
      return
    }
    setSelectedStep(null)
    setSelectedStage(workflow?.stages?.find(s => s.id === stageId))
    setShowStepForm(true)
    setShowStageForm(false)
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
      // Copy visualStructure from current workflow if it exists, otherwise create initial structure
      let visualStructure
      if (workflow?.visualStructure) {
        // Copy existing visualStructure and update timestamp
        visualStructure = {
          ...workflow.visualStructure,
          lastUpdated: new Date().toISOString(),
        }
      } else {
        // Create initial structure with start/end node positions
        visualStructure = {
          positions: {
            start: { x: 400, y: 50 },
            end: { x: 400, y: 200 },
          },
          lastUpdated: new Date().toISOString(),
        }
      }
      
      const response = await createWorkflowMutation.mutateAsync({
        name: currentName,
        version: nextVersion,
        visualStructure: visualStructure,
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

  const handleStageFormClose = () => {
    setShowStageForm(false)
    setSelectedStage(null)
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
      {/* Fixed Toolbar */}
      <Toolbar
        workflowName={workflowName}
        workflowVersion={workflowVersion}
        onWorkflowNameChange={setWorkflowName}
        onWorkflowVersionChange={setWorkflowVersion}
        onSave={handleSaveWorkflow}
        onBack={onBack}
        onAddStage={handleAddStage}
        canAddStage={!!workflowId && !isInUse}
        isSaving={createWorkflowMutation.isPending || updateWorkflowMutation.isPending}
        onCreateWorkItem={onCreateWorkItem}
        canCreateWorkItem={!!workflowId && workflow?.isActive}
        isLocked={isInUse}
        onCreateNewVersion={handleCreateNewVersion}
        isCreatingVersion={isCreatingVersion}
      />

      {/* Main content area - starts right below fixed toolbar */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        pt: (theme) => {
          const toolbarHeight = theme.mixins.toolbar.minHeight
          return typeof toolbarHeight === 'string' ? toolbarHeight : `${toolbarHeight || 64}px`
        },
      }}>
        {/* Warning banner when workflow is in use */}
        {isInUse && (
          <Alert severity="warning" sx={{ borderRadius: 0, flexShrink: 0 }}>
            This workflow definition is being used by <strong>{workItemsForWorkflow.length}</strong> work item(s).
            Steps cannot be added, edited, or deleted. To make changes, create a new version.
          </Alert>
        )}

        {/* Main content - stages sidebar, canvas, and form sidebar */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Stages Sidebar */}
          <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>
              Stages
            </Typography>
            {!workflowId && (
              <Typography variant="caption" color="text.secondary">
                Save workflow to add stages
              </Typography>
            )}
          </Box>
          
          {workflow?.stages && workflow.stages.length > 0 ? (
            <Box>
              {workflow.stages
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((stage) => (
                  <Box
                    key={stage.id}
                    onClick={() => handleStageClick(stage)}
                    sx={{
                      p: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      cursor: isInUse ? 'default' : 'pointer',
                      bgcolor: selectedStage?.id === stage.id ? 'action.selected' : 'transparent',
                      '&:hover': isInUse ? {} : { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {stage.name || `Stage ${stage.order}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Order: {stage.order} | Steps: {stage.steps?.length || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Type: {stage.stepCompletionType || 'ALL'}
                    </Typography>
                    
                    {/* Steps Accordion */}
                    {stage.steps && stage.steps.length > 0 && (
                      <Accordion 
                        sx={{ 
                          mt: 1, 
                          boxShadow: 'none',
                          '&:before': { display: 'none' },
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMore sx={{ fontSize: '1rem' }} />}
                          sx={{ 
                            minHeight: 36,
                            py: 0,
                            '& .MuiAccordionSummary-content': {
                              my: 0.5,
                            },
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            Steps: {stage.steps.length}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 1, px: 1 }}>
                          <Stack spacing={0.5}>
                            {stage.steps
                              .sort((a, b) => (a.order || 0) - (b.order || 0))
                              .map((step) => (
                                <Box
                                  key={step.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedStep(step)
                                    setSelectedStage(stage)
                                    setShowStepForm(true)
                                  }}
                                  sx={{
                                    p: 0.75,
                                    borderRadius: 0.5,
                                    bgcolor: 'background.paper',
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                      bgcolor: 'action.hover',
                                      borderColor: 'primary.main',
                                    },
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                    {step.name || `Step ${step.order}`}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25 }}>
                                    Order: {step.order} | Type: {step.approvalType || 'ALL'}
                                  </Typography>
                                </Box>
                              ))}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    )}
                    
                    {!isInUse && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddStep(stage.id)
                          }}
                          sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                        >
                          Add Step
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedStage(stage)
                            setShowStageForm(true)
                          }}
                          sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                        >
                          Edit
                        </Button>
                      </Box>
                    )}
                  </Box>
                ))}
            </Box>
          ) : workflowId ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No stages yet. Click "Add Stage" to create one.
              </Typography>
            </Box>
          ) : null}
          </Box>

          {/* Main Canvas */}
          <Box sx={{ flex: 1, position: 'relative', minHeight: 0, minWidth: 0, width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={undefined}
              onConnect={undefined}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              nodeTypes={nodeTypes}
              nodesDraggable={!isInUse}
              nodesConnectable={false}
              elementsSelectable={!isInUse}
              defaultEdgeOptions={{
                type: 'smoothstep',
                markerEnd: {
                  type: 'arrowclosed',
                  color: '#64b5f6', // Lighter blue for better dark mode visibility
                },
                style: { strokeWidth: 2, stroke: '#64b5f6' },
              }}
              fitView
              fitViewOptions={{
                padding: 0.2,
                includeHiddenNodes: false,
                maxZoom: 2.0,
                minZoom: 0.1,
                duration: 400,
              }}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </Box>

          {/* Step or Stage Form Sidebar */}
          {showStepForm && (
            <Box sx={{ width: 400, borderLeft: 1, borderColor: 'divider', overflow: 'auto' }}>
            <StepForm
              workflowId={workflow?.id}
              step={selectedStep}
              stageId={selectedStage?.id}
              onClose={handleStepFormClose}
              isReadOnly={isInUse}
            />
            </Box>
          )}

          {showStageForm && (
            <Box sx={{ width: 400, borderLeft: 1, borderColor: 'divider', overflow: 'auto' }}>
              <StageForm
                workflowId={workflow?.id}
                stage={selectedStage}
                onClose={handleStageFormClose}
                isReadOnly={isInUse}
              />
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Color Picker Dialog */}
      <Dialog 
        open={colorPickerOpen} 
        onClose={handleColorPickerClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Customize Colors - {colorPickerNode?.data?.label || colorPickerNode?.data?.stage?.name || colorPickerNode?.data?.step?.name || 'Node'}
        </DialogTitle>
        <DialogContent>
          <ColorPickerDialog
            node={colorPickerNode}
            currentColors={colorPickerNode ? customColors[colorPickerNode.id] : null}
            onSave={handleColorSave}
            onCancel={handleColorPickerClose}
          />
        </DialogContent>
      </Dialog>
      
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

// Color Picker Dialog Component
function ColorPickerDialog({ node, currentColors, onSave, onCancel }) {
  const [borderColor, setBorderColor] = useState(currentColors?.borderColor || '#3b82f6')
  const [backgroundColor, setBackgroundColor] = useState(currentColors?.backgroundColor || '')

  useEffect(() => {
    if (currentColors) {
      setBorderColor(currentColors.borderColor || '#3b82f6')
      setBackgroundColor(currentColors.backgroundColor || '')
    } else {
      setBorderColor('#3b82f6')
      setBackgroundColor('')
    }
  }, [currentColors])

  const handleSave = () => {
    onSave(borderColor, backgroundColor)
  }

  const handleReset = () => {
    setBorderColor('#3b82f6')
    setBackgroundColor('')
  }

  if (!node) return null

  return (
    <Box sx={{ pt: 2 }}>
      <Stack spacing={3}>
        <Box>
          <TextField
            label="Border Color"
            type="color"
            fullWidth
            value={borderColor}
            onChange={(e) => setBorderColor(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& input[type="color"]': {
                height: 56,
                cursor: 'pointer',
              },
            }}
          />
          <FormHelperText>
            Border color for {node.type === 'stageNode' ? 'stage' : 'step'} node
          </FormHelperText>
        </Box>
        <Box>
          <TextField
            label="Background Color"
            type="color"
            fullWidth
            value={backgroundColor || '#ffffff'}
            onChange={(e) => setBackgroundColor(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& input[type="color"]': {
                height: 56,
                cursor: 'pointer',
              },
            }}
          />
          <FormHelperText>
            Background color (leave as white for default theme-based color)
          </FormHelperText>
        </Box>
        <DialogActions>
          <Button onClick={handleReset} variant="outlined">
            Reset to Default
          </Button>
          <Button onClick={onCancel} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Apply Colors
          </Button>
        </DialogActions>
      </Stack>
    </Box>
  )
}

export default WorkflowDesigner
