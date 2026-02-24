import { useState, useMemo, useCallback } from 'react'
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
  TablePagination,
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
  Collapse,
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
  Refresh,
  FilterList,
  WorkOutline,
  AccountTree,
  Description,
} from '@mui/icons-material'
import { useSearchTasks, useApproveTask, useRejectTask } from '../../hooks/queries/useTasks'
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
    case 'IN_REVIEW':
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

// Tab index → status value mapping
const TAB_STATUS_MAP = {
  0: null,       // All
  1: 'PENDING',
  2: 'APPROVED',
  3: 'REJECTED',
}

function ApproverDashboard() {
  // ─── Search / Filter state ───
  const [approverInput, setApproverInput] = useState('')
  const [activeApprover, setActiveApprover] = useState('')
  const [searchText, setSearchText] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [timeCheckIn, setTimeCheckIn] = useState('createdAt')
  // "Applied" filter values — only used in API call after user clicks Apply
  const [activeStartDate, setActiveStartDate] = useState('')
  const [activeEndDate, setActiveEndDate] = useState('')
  const [activeTimeCheckIn, setActiveTimeCheckIn] = useState('createdAt')

  // ─── Pagination state ───
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // ─── Action state ───
  const [selectedTask, setSelectedTask] = useState(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState(null) // 'approve' or 'reject'
  const [comment, setComment] = useState('')

  // Build search params (uses "active" filter values only)
  const searchParams = useMemo(() => {
    const params = {
      approverId: activeApprover,
      page,
      size: rowsPerPage,
    }
    const status = TAB_STATUS_MAP[tabValue]
    if (status) params.status = status
    if (activeSearch) params.search = activeSearch
    if (activeStartDate) params.startTime = new Date(activeStartDate).getTime()
    if (activeEndDate) params.endTime = new Date(activeEndDate).getTime()
    if ((activeStartDate || activeEndDate) && activeTimeCheckIn) params.timeCheckIn = activeTimeCheckIn
    return params
  }, [activeApprover, page, rowsPerPage, tabValue, activeSearch, activeStartDate, activeEndDate, activeTimeCheckIn])

  const {
    data: taskResponse,
    isLoading,
    error,
    refetch,
  } = useSearchTasks(searchParams)

  const approveTaskMutation = useApproveTask()
  const rejectTaskMutation = useRejectTask()
  const { modal, showAlert, closeModal } = useModal()

  // Extract data from paginated response
  const tasks = taskResponse?.content || []
  const totalElements = taskResponse?.totalElements || 0
  const totalPages = taskResponse?.totalPages || 0

  // ─── Handlers ───

  const handleApproverSearch = useCallback(() => {
    if (approverInput.trim()) {
      setActiveApprover(approverInput.trim())
      setPage(0)
      setTabValue(0)
      setActiveSearch('')
      setSearchText('')
      setStartDate('')
      setEndDate('')
      setTimeCheckIn('createdAt')
      setActiveStartDate('')
      setActiveEndDate('')
      setActiveTimeCheckIn('createdAt')
    }
  }, [approverInput])

  const handleApproverKeyPress = (e) => {
    if (e.key === 'Enter') handleApproverSearch()
  }

  const handleApplyFilters = useCallback(() => {
    setActiveSearch(searchText.trim())
    setActiveStartDate(startDate)
    setActiveEndDate(endDate)
    setActiveTimeCheckIn(timeCheckIn)
    setPage(0)
  }, [searchText, startDate, endDate, timeCheckIn])

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') handleApplyFilters()
  }

  const handleTabChange = (_, newValue) => {
    setTabValue(newValue)
    setPage(0) // Reset to first page when switching tabs
  }

  const handleChangePage = (_, newPage) => setPage(newPage)

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  const handleClearFilters = () => {
    setSearchText('')
    setActiveSearch('')
    setStartDate('')
    setEndDate('')
    setTimeCheckIn('createdAt')
    setActiveStartDate('')
    setActiveEndDate('')
    setActiveTimeCheckIn('createdAt')
    setPage(0)
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

  const hasActiveFilters = activeSearch || activeStartDate || activeEndDate
  const hasPendingFilterChanges =
    searchText.trim() !== activeSearch ||
    startDate !== activeStartDate ||
    endDate !== activeEndDate ||
    timeCheckIn !== activeTimeCheckIn

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

        {/* Approver Search Bar */}
        <Stack direction="row" spacing={2} alignItems="stretch">
          <TextField
            fullWidth
            placeholder="Enter approver name or ID (e.g. hr, admin, it team)"
            value={approverInput}
            onChange={(e) => setApproverInput(e.target.value)}
            onKeyDown={handleApproverKeyPress}
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
            onClick={handleApproverSearch}
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

      {/* Loading state (first load only) */}
      {activeApprover && isLoading && !taskResponse && (
        <Box sx={{ py: 6 }}>
          <Loader size="medium" text={`Loading tasks for "${activeApprover}"...`} />
        </Box>
      )}

      {/* Results */}
      {activeApprover && taskResponse && (
        <Fade in>
          <Box>
            {/* Stats Cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Card sx={{ flex: 1 }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Results
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {totalElements}
                      </Typography>
                    </Box>
                    <Assignment sx={{ fontSize: 36, color: 'text.disabled' }} />
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, borderLeft: 3, borderColor: 'primary.main' }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Page
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="primary.main">
                        {totalPages > 0 ? `${page + 1} / ${totalPages}` : '0'}
                      </Typography>
                    </Box>
                    <Description sx={{ fontSize: 36, color: 'primary.light' }} />
                  </Stack>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, borderLeft: 3, borderColor: 'warning.main' }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Showing
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="warning.main">
                        {tasks.length}
                      </Typography>
                    </Box>
                    <FilterList sx={{ fontSize: 36, color: 'warning.light' }} />
                  </Stack>
                </CardContent>
              </Card>
            </Stack>

            {/* Task Table */}
            <Paper>
              {/* Table Header Row */}
              <Box
                sx={{
                  px: 2,
                  pt: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Person fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Tasks for:{' '}
                    <Chip label={activeApprover} size="small" color="primary" variant="outlined" />
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Tooltip title={showFilters ? 'Hide Filters' : 'Show Filters'}>
                    <IconButton
                      size="small"
                      onClick={() => setShowFilters(!showFilters)}
                      color={hasActiveFilters ? 'primary' : 'default'}
                    >
                      <FilterList fontSize="small" />
                      {hasActiveFilters && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                          }}
                        />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Refresh tasks">
                    <IconButton size="small" onClick={() => refetch()} disabled={isLoading}>
                      {isLoading ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Collapsible Filter Panel */}
              <Collapse in={showFilters}>
                <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                  <Stack spacing={2}>
                    {/* Search text */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="Search by step name, workflow name..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={handleSearchKeyPress}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Stack>

                    {/* Date range */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TextField
                        size="small"
                        type="datetime-local"
                        label="Start Date & Time"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 200 }}
                      />
                      <TextField
                        size="small"
                        type="datetime-local"
                        label="End Date & Time"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 200 }}
                      />
                      <TextField
                        select
                        size="small"
                        label="Date Field"
                        value={timeCheckIn}
                        onChange={(e) => setTimeCheckIn(e.target.value)}
                        SelectProps={{ native: true }}
                        sx={{ minWidth: 140 }}
                      >
                        <option value="createdAt">Created At</option>
                        <option value="dueAt">Due At</option>
                      </TextField>
                    </Stack>

                    {/* Apply / Clear buttons */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                      {hasPendingFilterChanges && (
                        <Typography variant="caption" color="warning.main" sx={{ mr: 1 }}>
                          Filters changed — click Apply
                        </Typography>
                      )}
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleApplyFilters}
                        startIcon={<Search fontSize="small" />}
                        color={hasPendingFilterChanges ? 'warning' : 'primary'}
                      >
                        Apply Filters
                      </Button>
                      {hasActiveFilters && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={handleClearFilters}
                          startIcon={<Close fontSize="small" />}
                        >
                          Clear
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                  <Divider sx={{ mt: 2 }} />
                </Box>
              </Collapse>

              {/* Tabs (sends status to API) */}
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                sx={{ px: 2 }}
                indicatorColor="primary"
              >
                <Tab label={<Box sx={{ pr: 1 }}>All</Box>} />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <AccessTime fontSize="small" color="warning" />
                      <span>Pending</span>
                    </Stack>
                  }
                />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CheckCircle fontSize="small" color="success" />
                      <span>Approved</span>
                    </Stack>
                  }
                />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Cancel fontSize="small" color="error" />
                      <span>Rejected</span>
                    </Stack>
                  }
                />
              </Tabs>
              <Divider />

              {/* Loading overlay for page changes */}
              {isLoading && taskResponse && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Loading...
                  </Typography>
                </Box>
              )}

              {tasks.length === 0 && !isLoading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    {tabValue === 0
                      ? 'No tasks found for this approver.'
                      : `No ${['', 'pending', 'approved', 'rejected'][tabValue]} tasks.`}
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Step</TableCell>
                          <TableCell>Workflow</TableCell>
                          <TableCell>Work Item</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Due Date</TableCell>
                          <TableCell>Acted At</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tasks.map((task) => {
                          const overdue = isOverdue(task.dueAt, task.status)
                          const stepName = task.stepInstance?.stepName || task.stepName || '—'
                          const stepOrder = task.stepInstance?.stepOrder || task.stepOrder
                          const wfName = task.workflowInstance?.workflowName || '—'
                          const wfStatus = task.workflowInstance?.workflowStatus
                          const wiId = task.workItem?.workItemId || task.workItemId
                          const wiStatus = task.workItem?.workItemStatus
                          const wiType = task.workItem?.type

                          return (
                            <TableRow
                              key={task.taskId}
                              hover
                              sx={{
                                bgcolor: overdue ? 'error.50' : 'inherit',
                                borderLeft: overdue ? '3px solid' : 'none',
                                borderLeftColor: overdue ? 'error.main' : 'transparent',
                              }}
                            >
                              {/* Step */}
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {stepName}
                                  </Typography>
                                  {stepOrder && (
                                    <Typography variant="caption" color="text.secondary">
                                      Order {stepOrder}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>

                              {/* Workflow */}
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {wfName}
                                  </Typography>
                                  {wfStatus && (
                                    <Chip
                                      label={wfStatus}
                                      size="small"
                                      color={getStatusColor(wfStatus)}
                                      variant="outlined"
                                      sx={{ fontSize: '0.65rem', height: 20, width: 'fit-content' }}
                                    />
                                  )}
                                </Stack>
                              </TableCell>

                              {/* Work Item */}
                              <TableCell>
                                <Stack spacing={0.25}>
                                  {wiId && (
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                      {wiId.substring(0, 8)}...
                                    </Typography>
                                  )}
                                  <Stack direction="row" spacing={0.5}>
                                    {wiType && (
                                      <Chip
                                        label={wiType}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.6rem', height: 18 }}
                                      />
                                    )}
                                    {wiStatus && (
                                      <Chip
                                        label={wiStatus}
                                        size="small"
                                        color={getStatusColor(wiStatus)}
                                        variant="outlined"
                                        sx={{ fontSize: '0.6rem', height: 18 }}
                                      />
                                    )}
                                  </Stack>
                                </Stack>
                              </TableCell>

                              {/* Task Status */}
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
                                    variant="outlined"
                                    sx={{ ml: 0.5, fontSize: '0.6rem', height: 18 }}
                                  />
                                )}
                              </TableCell>

                              {/* Created */}
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(task.createdAt)}
                                </Typography>
                              </TableCell>

                              {/* Due Date */}
                              <TableCell>
                                <Typography
                                  variant="caption"
                                  sx={{ color: overdue ? 'error.main' : 'text.secondary', fontWeight: overdue ? 600 : 400 }}
                                >
                                  {formatDate(task.dueAt)}
                                </Typography>
                              </TableCell>

                              {/* Acted At */}
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(task.actedAt)}
                                </Typography>
                              </TableCell>

                              {/* Actions */}
                              <TableCell align="right">
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
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

                  {/* Pagination */}
                  <TablePagination
                    component="div"
                    count={totalElements}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    showFirstButton
                    showLastButton
                  />
                </>
              )}
            </Paper>
          </Box>
        </Fade>
      )}

      {/* ─── Approve / Reject Action Dialog ─── */}
      <Dialog open={actionDialogOpen} onClose={handleCloseAction} maxWidth="sm" fullWidth>
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
            {actionType === 'approve' ? <ThumbUp fontSize="small" /> : <ThumbDown fontSize="small" />}
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
                    {selectedTask.stepInstance?.stepName || selectedTask.stepName || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Workflow
                  </Typography>
                  <Typography variant="body1">
                    {selectedTask.workflowInstance?.workflowName || '—'}
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

      {/* ─── Task Detail Dialog ─── */}
      <Dialog
        open={!!selectedTask && !actionDialogOpen}
        onClose={() => setSelectedTask(null)}
        maxWidth="md"
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
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Task Info */}
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Assignment fontSize="small" /> Task Information
                </Typography>
                <Stack spacing={1.5} sx={{ pl: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Task ID</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedTask.taskId}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
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
                      <Typography variant="caption" color="text.secondary">Approver</Typography>
                      <Typography variant="body2">{selectedTask.approverId || activeApprover || '—'}</Typography>
                    </Box>
                    {selectedTask.approverType && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Approver Type</Typography>
                        <Typography variant="body2">{selectedTask.approverType}</Typography>
                      </Box>
                    )}
                    {selectedTask.createdBy && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Created By</Typography>
                        <Typography variant="body2">{selectedTask.createdBy}</Typography>
                      </Box>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Created</Typography>
                      <Typography variant="body2">{formatDate(selectedTask.createdAt)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Due Date</Typography>
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
                        <Typography variant="caption" color="text.secondary">Acted At</Typography>
                        <Typography variant="body2">{formatDate(selectedTask.actedAt)}</Typography>
                      </Box>
                    )}
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              {/* Step Instance Info */}
              {selectedTask.stepInstance && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccountTree fontSize="small" /> Step Information
                  </Typography>
                  <Stack spacing={1} sx={{ pl: 1 }}>
                    <Stack direction="row" spacing={4}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Step Name</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {selectedTask.stepInstance.stepName}
                        </Typography>
                      </Box>
                      {selectedTask.stepInstance.stepOrder && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">Step Order</Typography>
                          <Typography variant="body1">{selectedTask.stepInstance.stepOrder}</Typography>
                        </Box>
                      )}
                    </Stack>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Step Instance ID</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {selectedTask.stepInstance.stepInstanceId}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* Workflow Instance Info */}
              {selectedTask.workflowInstance && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccountTree fontSize="small" /> Workflow Information
                    </Typography>
                    <Stack spacing={1} sx={{ pl: 1 }}>
                      <Stack direction="row" spacing={4}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Workflow Name</Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {selectedTask.workflowInstance.workflowName}
                          </Typography>
                        </Box>
                        {selectedTask.workflowInstance.workflowStatus && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={selectedTask.workflowInstance.workflowStatus}
                                size="small"
                                color={getStatusColor(selectedTask.workflowInstance.workflowStatus)}
                              />
                            </Box>
                          </Box>
                        )}
                      </Stack>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Workflow Instance ID</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {selectedTask.workflowInstance.workflowInstanceId}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </>
              )}

              {/* Work Item Info */}
              {selectedTask.workItem && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WorkOutline fontSize="small" /> Work Item Information
                    </Typography>
                    <Stack spacing={1} sx={{ pl: 1 }}>
                      <Stack direction="row" spacing={4}>
                        {selectedTask.workItem.type && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Type</Typography>
                            <Typography variant="body2">{selectedTask.workItem.type}</Typography>
                          </Box>
                        )}
                        {selectedTask.workItem.workItemStatus && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={selectedTask.workItem.workItemStatus}
                                size="small"
                                color={getStatusColor(selectedTask.workItem.workItemStatus)}
                              />
                            </Box>
                          </Box>
                        )}
                        {selectedTask.workItem.currentVersion && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Version</Typography>
                            <Typography variant="body2">v{selectedTask.workItem.currentVersion}</Typography>
                          </Box>
                        )}
                      </Stack>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Work Item ID</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {selectedTask.workItem.workItemId}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </>
              )}

              {/* Decisions */}
              {selectedTask.decisions && selectedTask.decisions.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircle fontSize="small" /> Decisions ({selectedTask.decisions.length})
                    </Typography>
                    <Stack spacing={1.5} sx={{ pl: 1 }}>
                      {selectedTask.decisions.map((d, idx) => (
                        <Paper key={d.decisionId || idx} variant="outlined" sx={{ p: 1.5 }}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                            <Chip
                              label={d.decision}
                              size="small"
                              color={getStatusColor(d.decision)}
                            />
                            <Typography variant="caption" color="text.secondary">
                              by <strong>{d.decidedBy}</strong> on {formatDate(d.decidedAt)}
                            </Typography>
                          </Stack>
                          {d.comments && (
                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                              "{d.comments}"
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                </>
              )}

              {/* Comments */}
              {selectedTask.comments && selectedTask.comments.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Comments ({selectedTask.comments.length})
                    </Typography>
                    <Stack spacing={1.5} sx={{ pl: 1 }}>
                      {selectedTask.comments.map((c, idx) => {
                        // Handle both string and object comment formats
                        const commentText = typeof c === 'string' ? c : c.comment || c.text || ''
                        const commentedBy = c.commentedBy || c.commented_by || c.user || 'Unknown'
                        const commentedAt = c.commentedAt || c.commented_at || c.timestamp || c.createdAt
                        
                        return (
                          <Paper key={c.commentId || idx} variant="outlined" sx={{ p: 1.5 }}>
                            {commentText && (
                              <Typography variant="body2" sx={{ mb: commentedBy || commentedAt ? 0.5 : 0 }}>
                                {commentText}
                              </Typography>
                            )}
                            {(commentedBy || commentedAt) && (
                              <Typography variant="caption" color="text.secondary">
                                {commentedBy && `by ${commentedBy}`}
                                {commentedBy && commentedAt && ' '}
                                {commentedAt && `on ${formatDate(commentedAt)}`}
                              </Typography>
                            )}
                          </Paper>
                        )
                      })}
                    </Stack>
                  </Box>
                </>
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
