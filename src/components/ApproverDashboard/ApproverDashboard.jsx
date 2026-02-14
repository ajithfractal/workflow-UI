import { useState, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  Fade,
  Divider,
  Badge,
} from '@mui/material'
import {
  Search,
  Person,
  CheckCircle,
  Cancel,
  Visibility,
  Close,
  ThumbUp,
  ThumbDown,
  AccessTime,
  Assignment,
  FilterList,
  Refresh,
} from '@mui/icons-material'
import { useTasksByApprover, useApproveTask, useRejectTask } from '../../hooks/queries/useTasks'
import { useModal } from '../../hooks/useModal'
import Modal from '../Modal/Modal'
import Loader from '../Loader/Loader'

// Status color mapping
const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'warning'
    case 'APPROVED':
      return 'success'
    case 'REJECTED':
      return 'error'
    case 'COMPLETED':
      return 'success'
    case 'IN_PROGRESS':
      return 'info'
    case 'NOT_STARTED':
      return 'default'
    default:
      return 'default'
  }
}

const getStatusIcon = (status) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return <AccessTime fontSize="small" />
    case 'APPROVED':
      return <CheckCircle fontSize="small" />
    case 'REJECTED':
      return <Cancel fontSize="small" />
    default:
      return null
  }
}

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// Check if a task is overdue
const isOverdue = (dueAt, status) => {
  if (!dueAt || status?.toUpperCase() !== 'PENDING') return false
  return new Date(dueAt) < new Date()
}

function ApproverDashboard() {
  const [approverInput, setApproverInput] = useState('')
  const [activeApprover, setActiveApprover] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState(null) // 'approve' or 'reject'
  const [comment, setComment] = useState('')
  const [tabValue, setTabValue] = useState(0) // 0 = All, 1 = Pending, 2 = Approved, 3 = Rejected

  const { data: tasks = [], isLoading, error, refetch } = useTasksByApprover(activeApprover)
  const approveTaskMutation = useApproveTask()
  const rejectTaskMutation = useRejectTask()
  const { modal, showAlert, closeModal } = useModal()

  // Filter tasks by tab
  const filteredTasks = useMemo(() => {
    if (tabValue === 0) return tasks
    const statusMap = { 1: 'PENDING', 2: 'APPROVED', 3: 'REJECTED' }
    const filterStatus = statusMap[tabValue]
    return tasks.filter((t) => t.status?.toUpperCase() === filterStatus)
  }, [tasks, tabValue])

  // Count tasks by status
  const taskCounts = useMemo(() => {
    const counts = { all: tasks.length, pending: 0, approved: 0, rejected: 0 }
    tasks.forEach((t) => {
      const s = t.status?.toUpperCase()
      if (s === 'PENDING') counts.pending++
      else if (s === 'APPROVED') counts.approved++
      else if (s === 'REJECTED') counts.rejected++
    })
    return counts
  }, [tasks])

  const handleSearch = () => {
    if (approverInput.trim()) {
      setActiveApprover(approverInput.trim())
      setTabValue(0)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleOpenAction = (task, type) => {
    setSelectedTask(task)
    setActionType(type)
    setComment('')
    setActionDialogOpen(true)
  }

  const handleCloseAction = () => {
    setActionDialogOpen(false)
    setSelectedTask(null)
    setActionType(null)
    setComment('')
  }

  const handleConfirmAction = async () => {
    if (!selectedTask || !actionType) return

    const mutation = actionType === 'approve' ? approveTaskMutation : rejectTaskMutation
    const actionLabel = actionType === 'approve' ? 'Approved' : 'Rejected'

    try {
      await mutation.mutateAsync({
        taskId: selectedTask.taskId,
        comment: comment.trim(),
        userId: activeApprover,
      })
      handleCloseAction()
      showAlert(
        `Task ${actionLabel.toLowerCase()} successfully!`,
        'success',
        actionLabel
      )
    } catch (err) {
      showAlert(
        `Failed to ${actionType} task: ${err.message}`,
        'error',
        'Error'
      )
    }
  }

  const handleViewTask = (task) => {
    setSelectedTask(task)
  }

  const isActionPending = approveTaskMutation.isPending || rejectTaskMutation.isPending

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Person sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Approver Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage approval tasks assigned to you
            </Typography>
          </Box>
        </Stack>

        {/* Search Bar */}
        <Stack direction="row" spacing={2} alignItems="stretch">
          <TextField
            fullWidth
            placeholder="Enter approver name or ID (e.g. hr, admin, it team)"
            value={approverInput}
            onChange={(e) => setApproverInput(e.target.value)}
            onKeyDown={handleKeyPress}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!approverInput.trim() || isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <Search />}
            sx={{ minWidth: 140 }}
          >
            {isLoading ? 'Searching...' : 'Search Tasks'}
          </Button>
        </Stack>
      </Paper>

      {/* No approver selected state */}
      {!activeApprover && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Assignment sx={{ fontSize: 40, color: 'text.secondary' }} />
          </Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Enter an Approver Name
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search for an approver to view their pending tasks and take action.
          </Typography>
        </Paper>
      )}

      {/* Error state */}
      {activeApprover && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load tasks: {error.message || 'Unknown error'}
        </Alert>
      )}

      {/* Loading state */}
      {activeApprover && isLoading && (
        <Box sx={{ py: 6 }}>
          <Loader size="medium" text={`Loading tasks for "${activeApprover}"...`} />
        </Box>
      )}

      {/* Results */}
      {activeApprover && !isLoading && !error && (
        <Fade in>
          <Box>
            {/* Stats Cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Tasks
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {taskCounts.all}
                      </Typography>
                    </Box>
                    <Assignment sx={{ fontSize: 36, color: 'text.disabled' }} />
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, borderLeft: 3, borderColor: 'warning.main' }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="warning.main">
                        {taskCounts.pending}
                      </Typography>
                    </Box>
                    <AccessTime sx={{ fontSize: 36, color: 'warning.light' }} />
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, borderLeft: 3, borderColor: 'success.main' }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Approved
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {taskCounts.approved}
                      </Typography>
                    </Box>
                    <CheckCircle sx={{ fontSize: 36, color: 'success.light' }} />
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, borderLeft: 3, borderColor: 'error.main' }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Rejected
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="error.main">
                        {taskCounts.rejected}
                      </Typography>
                    </Box>
                    <Cancel sx={{ fontSize: 36, color: 'error.light' }} />
                  </Stack>
                </CardContent>
              </Card>
            </Stack>

            {/* Task Table */}
            <Paper>
              <Box sx={{ px: 2, pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Person fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Tasks for: <Chip label={activeApprover} size="small" color="primary" variant="outlined" />
                  </Typography>
                </Stack>
                <Tooltip title="Refresh tasks">
                  <IconButton size="small" onClick={() => refetch()} disabled={isLoading}>
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                sx={{ px: 2 }}
                indicatorColor="primary"
              >
                <Tab
                  label={
                    <Badge badgeContent={taskCounts.all} color="primary" max={99}>
                      <Box sx={{ pr: 2 }}>All</Box>
                    </Badge>
                  }
                />
                <Tab
                  label={
                    <Badge badgeContent={taskCounts.pending} color="warning" max={99}>
                      <Box sx={{ pr: 2 }}>Pending</Box>
                    </Badge>
                  }
                />
                <Tab
                  label={
                    <Badge badgeContent={taskCounts.approved} color="success" max={99}>
                      <Box sx={{ pr: 2 }}>Approved</Box>
                    </Badge>
                  }
                />
                <Tab
                  label={
                    <Badge badgeContent={taskCounts.rejected} color="error" max={99}>
                      <Box sx={{ pr: 2 }}>Rejected</Box>
                    </Badge>
                  }
                />
              </Tabs>
              <Divider />

              {filteredTasks.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    {tabValue === 0
                      ? 'No tasks found for this approver.'
                      : `No ${['', 'pending', 'approved', 'rejected'][tabValue]} tasks.`}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Step Name</TableCell>
                        <TableCell>Work Item</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Acted At</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTasks.map((task) => {
                        const overdue = isOverdue(task.dueAt, task.status)
                        return (
                          <TableRow
                            key={task.taskId}
                            hover
                            sx={{
                              bgcolor: overdue ? 'error.main' : 'inherit',
                              '&:hover': {
                                bgcolor: overdue ? 'error.dark' : undefined,
                              },
                              ...(overdue && { '& .MuiTableCell-root': { color: 'white' } }),
                            }}
                          >
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2" fontWeight={500}>
                                  {task.stepName || task.stepInstanceId || '—'}
                                </Typography>
                                {task.stepOrder && (
                                  <Chip
                                    label={`Order ${task.stepOrder}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                  />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {task.workItemId
                                  ? `${task.workItemId.substring(0, 8)}...`
                                  : task.workflowName || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(task.status)}
                                label={task.status || 'Unknown'}
                                color={getStatusColor(task.status)}
                                size="small"
                                variant="filled"
                              />
                              {overdue && (
                                <Chip
                                  label="OVERDUE"
                                  color="error"
                                  size="small"
                                  sx={{ ml: 1, fontSize: '0.6rem', height: 18, bgcolor: overdue ? 'white' : undefined, color: overdue ? 'error.main' : undefined }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: overdue ? 'inherit' : 'text.secondary' }}>
                                {formatDate(task.dueAt)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(task.actedAt)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {task.status?.toUpperCase() === 'PENDING' && (
                                  <>
                                    <Tooltip title="Approve">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => handleOpenAction(task, 'approve')}
                                        disabled={isActionPending}
                                      >
                                        <ThumbUp fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reject">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleOpenAction(task, 'reject')}
                                        disabled={isActionPending}
                                      >
                                        <ThumbDown fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleViewTask(task)}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        </Fade>
      )}

      {/* Approve / Reject Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={handleCloseAction}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: actionType === 'approve' ? 'success.main' : 'error.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            {actionType === 'approve' ? (
              <ThumbUp fontSize="small" />
            ) : (
              <ThumbDown fontSize="small" />
            )}
            <span>{actionType === 'approve' ? 'Approve Task' : 'Reject Task'}</span>
          </Stack>
          <IconButton size="small" onClick={handleCloseAction} sx={{ color: 'white' }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedTask && (
            <Box sx={{ mb: 3 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Step Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedTask.stepName || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Task ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedTask.taskId}
                  </Typography>
                </Box>
                {selectedTask.dueAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Due Date
                    </Typography>
                    <Typography
                      variant="body2"
                      color={isOverdue(selectedTask.dueAt, selectedTask.status) ? 'error.main' : 'text.primary'}
                    >
                      {formatDate(selectedTask.dueAt)}
                      {isOverdue(selectedTask.dueAt, selectedTask.status) && ' (OVERDUE)'}
                    </Typography>
                  </Box>
                )}
              </Stack>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}
          <TextField
            label="Comment (optional)"
            placeholder={
              actionType === 'approve'
                ? 'Add approval notes...'
                : 'Add reason for rejection...'
            }
            multiline
            rows={4}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAction} disabled={isActionPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            onClick={handleConfirmAction}
            disabled={isActionPending}
            startIcon={
              isActionPending ? (
                <CircularProgress size={16} />
              ) : actionType === 'approve' ? (
                <ThumbUp />
              ) : (
                <ThumbDown />
              )
            }
          >
            {isActionPending
              ? 'Processing...'
              : actionType === 'approve'
              ? 'Approve'
              : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog
        open={!!selectedTask && !actionDialogOpen}
        onClose={() => setSelectedTask(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Task Details
          </Typography>
          <IconButton size="small" onClick={() => setSelectedTask(null)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Task ID
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedTask.taskId}
                </Typography>
              </Box>
              {selectedTask.stepInstanceId && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Step Instance ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedTask.stepInstanceId}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Step Name
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {selectedTask.stepName || '—'}
                </Typography>
              </Box>
              {selectedTask.stepOrder && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Step Order
                  </Typography>
                  <Typography variant="body1">
                    {selectedTask.stepOrder}
                  </Typography>
                </Box>
              )}
              {selectedTask.workItemId && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Work Item ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedTask.workItemId}
                  </Typography>
                </Box>
              )}
              {selectedTask.workflowName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Workflow
                  </Typography>
                  <Typography variant="body1">
                    {selectedTask.workflowName}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Approver
                </Typography>
                <Typography variant="body1">
                  {selectedTask.approverId || activeApprover || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    icon={getStatusIcon(selectedTask.status)}
                    label={selectedTask.status || 'Unknown'}
                    color={getStatusColor(selectedTask.status)}
                    size="small"
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Due Date
                </Typography>
                <Typography
                  variant="body2"
                  color={isOverdue(selectedTask.dueAt, selectedTask.status) ? 'error.main' : 'text.primary'}
                >
                  {formatDate(selectedTask.dueAt)}
                  {isOverdue(selectedTask.dueAt, selectedTask.status) && ' (OVERDUE)'}
                </Typography>
              </Box>
              {selectedTask.actedAt && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Acted At
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedTask.actedAt)}
                  </Typography>
                </Box>
              )}
              {selectedTask.comment && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Comment
                  </Typography>
                  <Typography variant="body2">
                    {selectedTask.comment}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedTask?.status?.toUpperCase() === 'PENDING' && (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<ThumbUp />}
                onClick={() => handleOpenAction(selectedTask, 'approve')}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<ThumbDown />}
                onClick={() => handleOpenAction(selectedTask, 'reject')}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setSelectedTask(null)}>Close</Button>
        </DialogActions>
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

export default ApproverDashboard
