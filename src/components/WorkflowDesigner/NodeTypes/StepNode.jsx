import { Handle, Position } from 'reactflow'
import { Box, Typography, Chip, Stack } from '@mui/material'
import '../../../styles/NodeTypes.css'

function StepNode({ data }) {
  const { step, order, isParallel, parallelGroupSize, isCompleted, isCurrent, isFailed } = data

  return (
    <Box
      className={`node step-node ${isParallel ? 'parallel' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFailed ? 'failed' : ''}`}
      sx={{
        padding: 2,
        borderRadius: 2,
        minWidth: 180,
        cursor: 'pointer',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" className="node-title" sx={{ fontWeight: 600 }}>
          {step?.name || data.label}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          {isParallel && (
            <Chip
              label={`⚡ ${parallelGroupSize}`}
              size="small"
              sx={{
                bgcolor: '#f59e0b',
                color: 'white',
                fontSize: '0.75rem',
                height: 20,
              }}
              title={`Parallel execution - ${parallelGroupSize} steps`}
            />
          )}
          {isFailed && (
            <Chip
              label="✗"
              size="small"
              sx={{
                bgcolor: '#ef4444',
                color: 'white',
                fontSize: '0.75rem',
                height: 20,
                fontWeight: 700,
              }}
              title="Step failed / rejected"
            />
          )}
          {isCompleted && !isFailed && (
            <Chip
              label="✓"
              size="small"
              sx={{
                bgcolor: '#10b981',
                color: 'white',
                fontSize: '0.75rem',
                height: 20,
              }}
              title="Step completed"
            />
          )}
          {isCurrent && !isCompleted && !isFailed && (
            <Chip
              label="→"
              size="small"
              sx={{
                bgcolor: '#3b82f6',
                color: 'white',
                fontSize: '0.75rem',
                height: 20,
              }}
              title="Current step"
            />
          )}
        </Stack>
      </Stack>
      <Box className="node-content">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip
            label={step?.approvalType || 'ALL'}
            size="small"
            className="approval-type"
            sx={{
              fontSize: '0.7rem',
              height: 18,
            }}
          />
          {step?.approvers && (
            <Typography variant="caption" className="approver-count">
              {step.approvers.length} approvers
            </Typography>
          )}
        </Stack>
        {isParallel && (
          <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5, color: 'var(--node-content)' }}>
            Order {order} - Parallel
          </Typography>
        )}
      </Box>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Box>
  )
}

export default StepNode
