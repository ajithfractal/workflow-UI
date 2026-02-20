import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material'
import { Add, Edit, Delete, List as ListIcon } from '@mui/icons-material'
import { useWorkflows, useDeleteWorkflow } from '../../hooks/queries/useWorkflows'
import { useModal } from '../../hooks/useModal'
import Loader from '../Loader/Loader'
import Modal from '../Modal/Modal'
import WorkItemList from '../WorkItemList/WorkItemList'

function WorkflowList({ onCreateWorkflow, onEditWorkflow, onViewWorkItems, onCreateAndSubmitWorkItem, onViewWorkItem }) {
  const { data: workflows = [], isLoading, error } = useWorkflows()
  const deleteWorkflowMutation = useDeleteWorkflow()
  const { modal, showAlert, showConfirm, closeModal } = useModal()

  const handleDelete = (workflowId, workflowName) => {
    showConfirm(
      `Are you sure you want to delete the workflow "${workflowName || workflowId}"? This action cannot be undone.`,
      async () => {
        try {
          await deleteWorkflowMutation.mutateAsync({ workflowId })
          showAlert('Workflow deleted successfully!', 'success', 'Success')
        } catch (error) {
          showAlert('Failed to delete workflow: ' + (error.message || 'Unknown error'), 'error', 'Error')
        }
      },
      'Delete Workflow',
      'warning'
    )
  }

  if (isLoading) {
    return <Loader size="large" text="Loading workflows..." />
  }

  if (error) {
    return <div className="error">Error: {error.message || 'Failed to load workflows'}</div>
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Workflows
          </Typography>
          <Stack direction="row" spacing={2}>
            {onCreateAndSubmitWorkItem && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onCreateAndSubmitWorkItem}
              >
                Create and Submit Work Item
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreateWorkflow}
            >
              Create New Workflow
            </Button>
          </Stack>
        </Box>

        {workflows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No workflows found. Create your first workflow to get started.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Steps</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(workflows) && workflows.map((workflow) => (
                  <TableRow key={workflow.id || workflow.workflowId} hover>
                    <TableCell>{workflow.name}</TableCell>
                    <TableCell>{workflow.version}</TableCell>
                    <TableCell>
                      <Chip
                        label={workflow.isActive ? 'Active' : 'Inactive'}
                        color={workflow.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {workflow.stages?.reduce((total, stage) => total + (stage.steps?.length || 0), 0) || 
                       workflow.steps?.length || 0}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => onEditWorkflow(workflow.id || workflow.workflowId)}
                          title="Edit Workflow"
                          color="primary"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        {onViewWorkItems && (
                          <IconButton
                            size="small"
                            onClick={() => onViewWorkItems(workflow.id || workflow.workflowId)}
                            title="View Work Items"
                            color="primary"
                          >
                            <ListIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(workflow.id || workflow.workflowId, workflow.name)}
                          title="Delete Workflow"
                          color="error"
                          disabled={deleteWorkflowMutation.isPending}
                        >
                          {deleteWorkflowMutation.isPending ? (
                            <CircularProgress size={16} />
                          ) : (
                          <Delete fontSize="small" />
                          )}
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* Show all work items below workflows */}
      <Box sx={{ mt: 4, pt: 3, borderTop: 2, borderColor: 'divider' }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          All Work Items
        </Typography>
        {onViewWorkItem && (
          <WorkItemList
            workflowId={null}
            onCreateWorkItem={onCreateAndSubmitWorkItem}
            onViewWorkItem={onViewWorkItem}
            onBack={null}
          />
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

export default WorkflowList
