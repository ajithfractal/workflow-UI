import { useState } from 'react'
import WorkflowList from './components/WorkflowList/WorkflowList'
import WorkflowDesigner from './components/WorkflowDesigner/WorkflowDesigner'
import './styles/App.css'

function App() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [view, setView] = useState('list') // 'list' or 'designer'

  const handleCreateWorkflow = () => {
    setSelectedWorkflowId(null)
    setView('designer')
  }

  const handleEditWorkflow = (workflowId) => {
    setSelectedWorkflowId(workflowId)
    setView('designer')
  }

  const handleBackToList = () => {
    setView('list')
    setSelectedWorkflowId(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Workflow Designer</h1>
      </header>
      <main className="app-main">
        {view === 'list' ? (
          <WorkflowList
            onCreateWorkflow={handleCreateWorkflow}
            onEditWorkflow={handleEditWorkflow}
          />
        ) : (
          <WorkflowDesigner
            workflowId={selectedWorkflowId}
            onBack={handleBackToList}
          />
        )}
      </main>
    </div>
  )
}

export default App
