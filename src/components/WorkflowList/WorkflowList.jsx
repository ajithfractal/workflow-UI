import { Plus, Edit, Trash2 } from 'lucide-react'
import { useWorkflows } from '../../hooks/queries/useWorkflows'
import '../../styles/WorkflowList.css'

function WorkflowList({ onCreateWorkflow, onEditWorkflow }) {
  const { data: workflows = [], isLoading, error } = useWorkflows()

  const handleDelete = async (workflowId) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      // Note: Delete endpoint may need to be implemented in backend
      alert('Delete functionality not yet implemented')
    }
  }

  if (isLoading) {
    return <div className="loading">Loading workflows...</div>
  }

  if (error) {
    return <div className="error">Error: {error.message || 'Failed to load workflows'}</div>
  }

  return (
    <div className="workflow-list">
      <div className="workflow-list-header">
        <h2>Workflows</h2>
        <button className="btn-primary" onClick={onCreateWorkflow}>
          <Plus size={20} />
          Create New Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="empty-state">
          <p>No workflows found. Create your first workflow to get started.</p>
        </div>
      ) : (
        <table className="workflow-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Status</th>
              <th>Steps</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(workflows) && workflows.map((workflow) => (
              <tr key={workflow.id || workflow.workflowId}>
                <td>{workflow.name}</td>
                <td>{workflow.version}</td>
                <td>
                  <span className={`status-badge ${workflow.isActive ? 'active' : 'inactive'}`}>
                    {workflow.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{workflow.steps?.length || 0}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon"
                      onClick={() => onEditWorkflow(workflow.id || workflow.workflowId)}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => handleDelete(workflow.id || workflow.workflowId)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default WorkflowList
