import { Handle, Position } from 'reactflow'
import { Box, Typography, Chip, Stack } from '@mui/material'
import '../../../styles/NodeTypes.css'

function StepNode({ data }) {
  const { step, order, isParallel, parallelGroupSize, isCompleted, isCurrent } = data

  const getBorderColor = () => {
    if (isCompleted) return '#10b981'
    if (isCurrent) return '#3b82f6'
    if (isParallel) return '#f59e0b'
    return '#3b82f6'
  }

  const getBackgroundColor = () => {
    if (isCompleted) return '#d1fae5'
    if (isCurrent) return '#dbeafe'
    if (isParallel) return '#fffbeb'
    return 'white'
  }

  return (
    <Box
      className={`node step-node ${isParallel ? 'parallel' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
      sx={{
        background: getBackgroundColor(),
        border: `3px solid ${getBorderColor()}`,
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
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
          {isCompleted && (
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
          {isCurrent && !isCompleted && (
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
      <Box sx={{ fontSize: '0.75rem', color: '#64748b' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip
            label={step?.approvalType || 'ALL'}
            size="small"
            sx={{
              bgcolor: '#dbeafe',
              color: '#1e40af',
              fontSize: '0.7rem',
              height: 18,
            }}
          />
          {step?.approvers && (
            <Typography variant="caption" color="text.secondary">
              {step.approvers.length} approvers
            </Typography>
          )}
        </Stack>
        {isParallel && (
          <Typography variant="caption" sx={{ color: '#d97706', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
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
