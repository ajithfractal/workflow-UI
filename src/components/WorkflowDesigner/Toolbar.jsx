import { Save, ArrowLeft, Plus } from 'lucide-react'
import '../../styles/Toolbar.css'

function Toolbar({
  workflowName,
  workflowVersion,
  onWorkflowNameChange,
  onWorkflowVersionChange,
  onSave,
  onBack,
  onAddStep,
  canAddStep,
}) {
  return (
    <div className="toolbar">
      <button className="btn-icon" onClick={onBack} title="Back to List">
        <ArrowLeft size={20} />
      </button>

      <div className="toolbar-workflow-info">
        <input
          type="text"
          className="workflow-name-input"
          placeholder="Workflow Name"
          value={workflowName}
          onChange={(e) => onWorkflowNameChange(e.target.value)}
        />
        <input
          type="number"
          className="workflow-version-input"
          placeholder="Version"
          value={workflowVersion}
          onChange={(e) => onWorkflowVersionChange(parseInt(e.target.value) || 1)}
          min="1"
        />
      </div>

      <div className="toolbar-actions">
        {canAddStep && (
          <button className="btn-secondary" onClick={onAddStep} title="Add Step">
            <Plus size={20} />
            Add Step
          </button>
        )}
        <button className="btn-primary" onClick={onSave}>
          <Save size={20} />
          Save Workflow
        </button>
      </div>
    </div>
  )
}

export default Toolbar
