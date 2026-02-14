import { Handle, Position } from 'reactflow'
import { Box, Typography } from '@mui/material'
import '../../../styles/NodeTypes.css'

function StartNode({ data }) {
  return (
    <Box
      className="node start-node"
      sx={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
      <Handle type="source" position={Position.Bottom} />
    </Box>
  )
}

export default StartNode
