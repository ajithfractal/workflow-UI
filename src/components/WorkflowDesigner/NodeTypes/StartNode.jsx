import { Handle, Position } from 'reactflow'
import '../../../styles/NodeTypes.css'

function StartNode({ data }) {
  return (
    <div className="node start-node">
      <div className="node-label">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default StartNode
