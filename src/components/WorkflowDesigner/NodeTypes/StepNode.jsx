import { Handle, Position } from 'reactflow'
import '../../../styles/NodeTypes.css'

function StepNode({ data }) {
  const { step, order, isParallel, parallelGroupSize } = data

  return (
    <div className={`node step-node ${isParallel ? 'parallel' : ''}`}>
      <div className="node-header">
        <div className="node-title">{step?.name || data.label}</div>
        {isParallel && (
          <span className="parallel-badge" title={`Parallel execution - ${parallelGroupSize} steps`}>
            ⚡ {parallelGroupSize}
          </span>
        )}
      </div>
      <div className="node-content">
        <div className="node-info">
          <span className="approval-type">{step?.approvalType || 'ALL'}</span>
          {step?.approvers && (
            <span className="approver-count">{step.approvers.length} approvers</span>
          )}
        </div>
        {isParallel && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#d97706', fontStyle: 'italic' }}>
            Order {order} - Parallel
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default StepNode
