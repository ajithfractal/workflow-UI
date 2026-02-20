import { Handle, Position } from 'reactflow'
import { Box, Typography, Chip, Stack, Divider, useTheme } from '@mui/material'
import '../../../styles/NodeTypes.css'

function StageNode({ data }) {
  const { stage, steps = [], isCompleted, isCurrent, isFailed } = data
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
  const getStageColor = () => {
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
      className={`node stage-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFailed ? 'failed' : ''}`}
      sx={{
        padding: 2,
        borderRadius: 2,
        minWidth: 250,
        minHeight: 120,
        cursor: 'pointer',
        border: 2,
        borderColor: getBorderColor(),
        bgcolor: getStageColor(),
        boxShadow: 2,
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography 
          variant="body2" 
          className="node-title" 
          sx={{ 
            fontWeight: 600, 
            fontSize: '0.875rem',
            color: 'primary.main',
            fontFamily: 'inherit',
          }}
        >
          {stage?.name || data.label}
        </Typography>
        <Chip
          label={`Order: ${stage?.order || 0}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: '0.75rem', height: 22, fontWeight: 500 }}
        />
      </Stack>
      
      <Divider sx={{ my: 1 }} />
      
      <Box className="node-content">
        <Stack spacing={0.5}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: '0.75rem', fontWeight: 400, fontFamily: 'inherit' }}
          >
            Type: {stage?.stepCompletionType || 'ALL'}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: '0.75rem', fontWeight: 400, fontFamily: 'inherit' }}
          >
            Steps: {steps.length}
          </Typography>
          {steps.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {steps.slice(0, 3).map((step, idx) => (
                <Typography
                  key={step.id || idx}
                  variant="caption"
                  sx={{
                    display: 'block',
                    py: 0.25,
                    px: 1,
                    mb: 0.25,
                    borderRadius: 0.5,
                    bgcolor: 'action.hover',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                  }}
                >
                  • {step.name || `Step ${step.order}`}
                </Typography>
              ))}
              {steps.length > 3 && (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: '0.75rem', fontWeight: 400, fontFamily: 'inherit' }}
                >
                  +{steps.length - 3} more
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Box>
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right} id="right" />
    </Box>
  )
}

export default StageNode
