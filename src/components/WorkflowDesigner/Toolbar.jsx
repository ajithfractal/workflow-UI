import {
  AppBar,
  Toolbar as MuiToolbar,
  TextField,
  Button,
  IconButton,
  Stack,
  Box,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material'
import { Save, ArrowBack, Add, List as ListIcon, Lock, ContentCopy } from '@mui/icons-material'

function Toolbar({
  workflowName,
  workflowVersion,
  onWorkflowNameChange,
  onWorkflowVersionChange,
  onSave,
  onBack,
  onAddStep,
  onAddStage,
  canAddStep,
  canAddStage,
  isSaving,
  onCreateWorkItem,
  canCreateWorkItem,
  isLocked,
  onCreateNewVersion,
  isCreatingVersion,
}) {
  return (
    <AppBar position="fixed" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: 1, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
            disabled={isLocked}
          />
          <TextField
            size="small"
            type="number"
            placeholder="Version"
            value={workflowVersion}
            onChange={(e) => onWorkflowVersionChange(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1 }}
            sx={{ width: 100 }}
            disabled={isLocked}
          />
          {isLocked && (
            <Tooltip title="This workflow is being used by work items. Steps cannot be modified.">
              <Chip
                icon={<Lock fontSize="small" />}
                label="In Use — Locked"
                color="warning"
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          {canCreateWorkItem && onCreateWorkItem && (
            <Button
              variant="outlined"
              startIcon={<ListIcon />}
              onClick={onCreateWorkItem}
              title="Create and Submit Work Item"
            >
              Create and Submit Work Item
            </Button>
          )}

          {isLocked ? (
            <Button
              variant="contained"
              color="warning"
              startIcon={isCreatingVersion ? <CircularProgress size={16} color="inherit" /> : <ContentCopy />}
              onClick={onCreateNewVersion}
              disabled={isCreatingVersion}
            >
              {isCreatingVersion ? 'Creating...' : 'Create New Version'}
            </Button>
          ) : (
            <>
          {canAddStage && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={onAddStage}
              title="Add Stage"
            >
              Add Stage
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
            </>
          )}
        </Stack>
      </MuiToolbar>
    </AppBar>
  )
}

export default Toolbar
