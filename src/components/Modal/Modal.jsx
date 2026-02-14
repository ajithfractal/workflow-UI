import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  IconButton,
  Box,
  Alert,
  AlertTitle,
} from '@mui/material'
import { Close, CheckCircle, Error, Info, Warning } from '@mui/icons-material'

function Modal({ isOpen, onClose, title, message, type = 'info', onConfirm, showCancel = false }) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const getDefaultTitle = () => {
    switch (type) {
      case 'success':
        return 'Success'
      case 'error':
        return 'Error'
      case 'warning':
        return 'Warning'
      default:
        return 'Information'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ mr: 1 }} />
      case 'error':
        return <Error sx={{ mr: 1 }} />
      case 'warning':
        return <Warning sx={{ mr: 1 }} />
      default:
        return <Info sx={{ mr: 1 }} />
    }
  }

  const getSeverity = () => {
    switch (type) {
      case 'success':
        return 'success'
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      default:
        return 'info'
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getIcon()}
          {title || getDefaultTitle()}
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Alert severity={getSeverity()} sx={{ mb: 2 }}>
          <AlertTitle>{title || getDefaultTitle()}</AlertTitle>
          <DialogContentText component="div" sx={{ mt: 1 }}>
            {message}
          </DialogContentText>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {showCancel && (
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={type === 'error' ? 'error' : 'primary'}
          autoFocus
        >
          {showCancel ? 'Confirm' : 'OK'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default Modal
