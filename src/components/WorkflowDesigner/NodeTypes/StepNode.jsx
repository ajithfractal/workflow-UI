import { Handle, Position } from 'reactflow'
import { Box, Typography, Stack, useTheme } from '@mui/material'
import '../../../styles/NodeTypes.css'

function StepNode({ data }) {
  const { step, order, isParallel, parallelGroupSize, isCompleted, isCurrent, isFailed } = data
  const theme = useTheme()

  // Get border color based on state or custom color
  const getBorderColor = () => {
    // Priority: state colors > custom colors > default
    if (isFailed) return theme.palette.error.main
    if (isCompleted) return theme.palette.success.main
    if (isCurrent) return theme.palette.primary.main
    // Use custom color if provided
    if (data.customBorderColor) return data.customBorderColor
    return theme.palette.primary.main
  }

  // Get background color based on state or custom color - theme aware
  const getStepColor = () => {
    // Priority: state colors > custom colors > default
    if (isFailed) {
      return theme.palette.mode === 'dark' ? '#7f1d1d' : '#fee2e2'
    }
    if (isCompleted) {
      return theme.palette.mode === 'dark' ? '#064e3b' : '#d1fae5'
    }
    if (isCurrent) {
      return theme.palette.mode === 'dark' ? '#1e3a5f' : '#dbeafe'
    }
    // Use custom color if provided
    if (data.customBackgroundColor) return data.customBackgroundColor
    return theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff'
  }

  return (
    <Box
      className={`step-node-polygon ${isParallel ? 'parallel' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFailed ? 'failed' : ''}`}
      sx={{
        position: 'relative',
        padding: 2,
        borderRadius: 2,
        minWidth: 140,
        minHeight: 100,
        cursor: 'pointer',
        border: 2,
        borderColor: getBorderColor(),
        bgcolor: getStepColor(),
        boxShadow: 2,
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack 
        direction="column" 
        alignItems="center" 
        justifyContent="center" 
        sx={{ 
          textAlign: 'center',
          width: '100%',
        }}
      >
        <Typography 
          variant="body2" 
          className="step-node-title" 
          sx={{ 
            fontWeight: 600, 
            fontSize: '0.875rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            lineHeight: 1.4,
            maxWidth: '100%',
            color: 'primary.main',
            mb: step?.order ? 0.25 : 0,
            fontFamily: 'inherit',
          }}
        >
          {step?.name || data.label}
        </Typography>
        {step?.order && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              fontSize: '0.75rem', 
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            {step.order}
          </Typography>
        )}
      </Stack>
      <Handle type="target" position={Position.Left} style={{ zIndex: 2 }} />
      <Handle type="source" position={Position.Right} style={{ zIndex: 2 }} />
    </Box>
  )
}

export default StepNode
