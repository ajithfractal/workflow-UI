import { Handle, Position } from 'reactflow'
import { Box, Typography } from '@mui/material'
import '../../../styles/NodeTypes.css'

function EndNode({ data }) {
  return (
    <Box
      className="node end-node"
      sx={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        textAlign: 'center',
        padding: 2,
        borderRadius: 2,
        minWidth: 180,
        boxShadow: 2,
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {data.label}
      </Typography>
      <Handle type="target" position={Position.Top} />
    </Box>
  )
}

export default EndNode
