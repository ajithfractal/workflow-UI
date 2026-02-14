import {
  AppBar,
  Toolbar as MuiToolbar,
  TextField,
  Button,
  IconButton,
  Stack,
  Box,
  CircularProgress,
} from '@mui/material'
import { Save, ArrowBack, Add, List as ListIcon } from '@mui/icons-material'

function Toolbar({
  workflowName,
  workflowVersion,
  onWorkflowNameChange,
  onWorkflowVersionChange,
  onSave,
  onBack,
  onAddStep,
  canAddStep,
  isSaving,
  onCreateWorkItem,
  canCreateWorkItem,
}) {
  return (
    <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1 }}>
      <MuiToolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={onBack}
          title="Back to List"
          sx={{ mr: 2 }}
        >
          <ArrowBack />
        </IconButton>

        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Workflow Name"
            value={workflowName}
            onChange={(e) => onWorkflowNameChange(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <TextField
            size="small"
            type="number"
            placeholder="Version"
            value={workflowVersion}
            onChange={(e) => onWorkflowVersionChange(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1 }}
            sx={{ width: 100 }}
          />
        </Box>

        <Stack direction="row" spacing={1}>
          {canCreateWorkItem && onCreateWorkItem && (
            <Button
              variant="outlined"
              startIcon={<ListIcon />}
              onClick={onCreateWorkItem}
              title="Create Work Item"
            >
              Create Work Item
            </Button>
          )}
          {canAddStep && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={onAddStep}
              title="Add Step"
            >
              Add Step
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </Stack>
      </MuiToolbar>
    </AppBar>
  )
}

export default Toolbar
