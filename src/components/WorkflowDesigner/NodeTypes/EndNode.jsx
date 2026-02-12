import { Handle, Position } from 'reactflow'
import '../../../styles/NodeTypes.css'

function EndNode({ data }) {
  return (
    <div className="node end-node">
      <div className="node-label">{data.label}</div>
      <Handle type="target" position={Position.Top} />
    </div>
  )
}

export default EndNode
