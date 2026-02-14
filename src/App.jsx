import { useState } from 'react'
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material'
import WorkflowList from './components/WorkflowList/WorkflowList'
import WorkflowDesigner from './components/WorkflowDesigner/WorkflowDesigner'
import WorkItemList from './components/WorkItemList/WorkItemList'
import WorkItemForm from './components/WorkItemForm/WorkItemForm'
import WorkItemViewer from './components/WorkItemViewer/WorkItemViewer'

function App() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [selectedWorkItemId, setSelectedWorkItemId] = useState(null)
  const [view, setView] = useState('list') // 'list', 'designer', 'workItems', 'workItemForm', 'workItemViewer'

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

  const handleCreateWorkItem = () => {
    setView('workItemForm')
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0 }}>
            Workflow Designer
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        {view === 'list' && (
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <WorkflowList
              onCreateWorkflow={handleCreateWorkflow}
              onEditWorkflow={handleEditWorkflow}
              onViewWorkItems={handleViewWorkItems}
              onCreateWorkItem={() => {
                setSelectedWorkflowId(null)
                setView('workItemForm')
              }}
              onViewWorkItem={handleViewWorkItem}
            />
          </Container>
        )}
        {view === 'designer' && (
          <WorkflowDesigner
            workflowId={selectedWorkflowId}
            onBack={handleBackToList}
            onCreateWorkItem={handleCreateWorkItem}
          />
        )}
        {view === 'workItems' && (
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <WorkItemList
              workflowId={selectedWorkflowId}
              onCreateWorkItem={handleCreateWorkItem}
              onViewWorkItem={handleViewWorkItem}
              onBack={handleBackToList}
            />
          </Container>
        )}
        {view === 'workItemForm' && (
          <Container maxWidth="md" sx={{ py: 3 }}>
            <WorkItemForm
              workflowId={selectedWorkflowId}
              workflowName={''}
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
      </Box>
    </Box>
  )
}

export default App
