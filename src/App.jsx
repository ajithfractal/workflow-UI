import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, Container, Button, Stack, IconButton, Tooltip } from '@mui/material'
import { Home, SupervisorAccount, DarkMode, LightMode } from '@mui/icons-material'
import { useColorMode } from './theme/ColorModeContext'
import WorkflowList from './components/WorkflowList/WorkflowList'
import WorkflowDesigner from './components/WorkflowDesigner/WorkflowDesigner'
import WorkItemList from './components/WorkItemList/WorkItemList'
import WorkItemSubmitForm from './components/WorkItemSubmitForm/WorkItemSubmitForm'
import WorkItemViewer from './components/WorkItemViewer/WorkItemViewer'
import ApproverDashboard from './components/ApproverDashboard/ApproverDashboard'

function MainApp() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [selectedWorkItemId, setSelectedWorkItemId] = useState(null)
  const [view, setView] = useState('list') // 'list', 'designer', 'workItems', 'workItemSubmitForm', 'workItemViewer'

  const handleCreateWorkflow = () => {
    setSelectedWorkflowId(null)
    setView('designer')
  }

  const handleEditWorkflow = (workflowId) => {
    setSelectedWorkflowId(workflowId)
    setView('designer')
  }

  const handleViewWorkItems = (workflowId) => {
    // Navigate to filtered work items list for the selected workflow
    setSelectedWorkflowId(workflowId)
    setView('workItems')
  }

  const handleCreateAndSubmitWorkItem = () => {
    setView('workItemSubmitForm')
  }

  const handleViewWorkItem = (workItemId) => {
    setSelectedWorkItemId(workItemId)
    setView('workItemViewer')
  }

  const handleBackToList = () => {
    setView('list')
    setSelectedWorkflowId(null)
    setSelectedWorkItemId(null)
  }

  const handleBackToWorkItems = () => {
    setView('workItems')
    setSelectedWorkItemId(null)
  }

  const handleWorkItemCreated = (workItemId) => {
    setSelectedWorkItemId(workItemId)
    setView('workItemViewer')
  }

  return (
    <>
      {view === 'list' && (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <WorkflowList
            onCreateWorkflow={handleCreateWorkflow}
            onEditWorkflow={handleEditWorkflow}
            onViewWorkItems={handleViewWorkItems}
            onCreateAndSubmitWorkItem={() => {
              setSelectedWorkflowId(null)
              setView('workItemSubmitForm')
            }}
            onViewWorkItem={handleViewWorkItem}
          />
        </Container>
      )}
      {view === 'designer' && (
        <WorkflowDesigner
          workflowId={selectedWorkflowId}
          onBack={handleBackToList}
          onCreateWorkItem={handleCreateAndSubmitWorkItem}
          onNavigateToWorkflow={(newWorkflowId) => {
            setSelectedWorkflowId(newWorkflowId)
            // view stays as 'designer'
          }}
        />
      )}
      {view === 'workItems' && (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <WorkItemList
            workflowId={selectedWorkflowId}
            onCreateWorkItem={handleCreateAndSubmitWorkItem}
            onViewWorkItem={handleViewWorkItem}
            onBack={handleBackToList}
          />
        </Container>
      )}
      {view === 'workItemSubmitForm' && (
        <Container maxWidth="md" sx={{ py: 3 }}>
          <WorkItemSubmitForm
            onClose={() => {
              if (selectedWorkflowId) {
                setView('workItems')
              } else {
                setView('list')
              }
            }}
            onSuccess={handleWorkItemCreated}
          />
        </Container>
      )}
      {view === 'workItemViewer' && (
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <WorkItemViewer
            workItemId={selectedWorkItemId}
            onBack={handleBackToWorkItems}
          />
        </Container>
      )}
    </>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, toggleColorMode } = useColorMode()

  const isApproverPage = location.pathname === '/approvers'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 0, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Workflow Designer
          </Typography>
          <Stack direction="row" spacing={1} sx={{ ml: 4, flexGrow: 1 }}>
            <Button
              color="inherit"
              startIcon={<Home />}
              onClick={() => navigate('/')}
              sx={{
                opacity: !isApproverPage ? 1 : 0.7,
                borderBottom: !isApproverPage ? '2px solid white' : '2px solid transparent',
                borderRadius: 0,
                px: 2,
              }}
            >
              Home
            </Button>
            <Button
              color="inherit"
              startIcon={<SupervisorAccount />}
              onClick={() => navigate('/approvers')}
              sx={{
                opacity: isApproverPage ? 1 : 0.7,
                borderBottom: isApproverPage ? '2px solid white' : '2px solid transparent',
                borderRadius: 0,
                px: 2,
              }}
            >
              Approvers
            </Button>
          </Stack>

          {/* Dark / Light mode toggle */}
          <Tooltip title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton color="inherit" onClick={toggleColorMode} sx={{ ml: 1 }}>
              {mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        <Routes>
          <Route path="/*" element={<MainApp />} />
          <Route
            path="/approvers"
            element={
              <Container maxWidth="xl" sx={{ py: 3 }}>
                <ApproverDashboard />
              </Container>
            }
          />
        </Routes>
      </Box>
    </Box>
  )
}

export default App
