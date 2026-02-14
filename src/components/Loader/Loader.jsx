import { Box, CircularProgress, Typography } from '@mui/material'

function Loader({ size = 'medium', text, fullScreen = false }) {
  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60,
  }

  const progressSize = sizeMap[size] || 40

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          zIndex: 9999,
        }}
      >
        <CircularProgress size={progressSize} />
        {text && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {text}
          </Typography>
        )}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        gap: 1,
      }}
    >
      <CircularProgress size={progressSize} />
      {text && (
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      )}
    </Box>
  )
}

export default Loader
