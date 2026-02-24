# Backend API Changes: Visual Structure Storage

## Overview

This document describes the backend changes required to support storing workflow diagram visual structure (node positions, layout data) in the database using a JSONB field.

## Database Schema Changes

### Add `visual_structure` JSONB Column

Add a new column to the `workflow_definitions` table:

```sql
ALTER TABLE workflow_definitions 
ADD COLUMN visual_structure JSONB DEFAULT NULL;
```

**Column Details:**
- **Type**: `JSONB` (PostgreSQL) or equivalent JSON type for your database
- **Nullable**: `YES` (default `NULL`)
- **Purpose**: Store visual layout information for the workflow diagram

## JSON Structure

The `visual_structure` field should store a JSON object with the following structure:

```json
{
  "positions": {
    "start": { "x": 400, "y": 100 },
    "stage-{stageId}": { "x": 400, "y": 250 },
    "step-{stepId}": { "x": 700, "y": 250 },
    "end": { "x": 400, "y": 500 }
  },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

**Fields:**
- `positions` (object, required): Map of node IDs to their x,y coordinates
  - Key: Node ID (e.g., `"start"`, `"stage-123"`, `"step-456"`, `"end"`)
  - Value: Object with `x` (number) and `y` (number) properties
- `lastUpdated` (string, optional): ISO 8601 timestamp of when the structure was last updated

## API Endpoint Changes

### 1. Update Workflow Definition Endpoint

**Endpoint**: `PUT /api/workflow-definitions/{workflowId}`

**Request Body** (add support for `visualStructure`):

```json
{
  "name": "Loan Approval",
  "version": 1,
  "visualStructure": {
    "positions": {
      "start": { "x": 400, "y": 100 },
      "stage-abc123": { "x": 400, "y": 250 },
      "step-def456": { "x": 700, "y": 250 },
      "end": { "x": 400, "y": 500 }
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response**: Should include the updated `visualStructure` in the response:

```json
{
  "workflowId": "workflow-uuid",
  "name": "Loan Approval",
  "version": 1,
  "isActive": true,
  "visualStructure": {
    "positions": {
      "start": { "x": 400, "y": 100 },
      "stage-abc123": { "x": 400, "y": 250 },
      "step-def456": { "x": 700, "y": 250 },
      "end": { "x": 400, "y": 500 }
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "stages": [...]
}
```

### 2. Get Workflow Definition Endpoint

**Endpoint**: `GET /api/workflow-definitions/{workflowId}`

**Response**: Should include `visualStructure` field in the response:

```json
{
  "workflowId": "workflow-uuid",
  "name": "Loan Approval",
  "version": 1,
  "isActive": true,
  "visualStructure": {
    "positions": {
      "start": { "x": 400, "y": 100 },
      "stage-abc123": { "x": 400, "y": 250 },
      "step-def456": { "x": 700, "y": 250 },
      "end": { "x": 400, "y": 500 }
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "stages": [...]
}
```

## Backend Implementation Notes

### 1. DTO/Model Updates

Update your workflow definition DTO/model to include `visualStructure`:

**Java Example:**
```java
@Column(name = "visual_structure", columnDefinition = "jsonb")
@Type(type = "jsonb")
private Map<String, Object> visualStructure;
```

**TypeScript/Node.js Example:**
```typescript
interface WorkflowDefinition {
  workflowId: string;
  name: string;
  version: number;
  isActive: boolean;
  visualStructure?: {
    positions: Record<string, { x: number; y: number }>;
    lastUpdated?: string;
  };
  stages: StageDefinition[];
}
```

### 2. Validation

- Validate that `visualStructure.positions` is an object
- Validate that position values have `x` and `y` as numbers
- Optionally validate that node IDs match existing nodes in the workflow
- Validate `lastUpdated` is a valid ISO 8601 timestamp (if provided)

### 3. Partial Updates

The `PUT /api/workflow-definitions/{workflowId}` endpoint should support partial updates:
- If only `visualStructure` is provided, update only that field
- If both `name`/`version` and `visualStructure` are provided, update all fields
- Do not require all fields to be present in the request

### 4. Migration Strategy

1. **Add column with default NULL**: Existing workflows will have `NULL` visual structure
2. **Frontend fallback**: Frontend will use automatic layout if `visualStructure` is `NULL`
3. **Gradual migration**: As users interact with workflows, visual structures will be saved

### 5. Performance Considerations

- **Indexing**: Consider adding a GIN index on the `visual_structure` column if you need to query by position data:
  ```sql
  CREATE INDEX idx_workflow_definitions_visual_structure 
  ON workflow_definitions USING GIN (visual_structure);
  ```
- **Size limits**: JSONB fields can be large; ensure your database has appropriate limits
- **Caching**: Consider caching workflow definitions with visual structure if they're frequently accessed

## Frontend Integration

The frontend will:
1. **Load**: Read `visualStructure` from the workflow definition response
2. **Save**: Send `visualStructure` updates via `PUT /api/workflow-definitions/{workflowId}`
3. **Fallback**: Use automatic layout if `visualStructure` is `NULL` or missing

## Example API Calls

### Save Visual Structure

```bash
PUT /api/workflow-definitions/workflow-123?updatedBy=user1
Content-Type: application/json

{
  "visualStructure": {
    "positions": {
      "start": { "x": 400, "y": 100 },
      "stage-abc": { "x": 400, "y": 250 },
      "step-def": { "x": 700, "y": 250 },
      "end": { "x": 400, "y": 500 }
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Workflow with Visual Structure

```bash
GET /api/workflow-definitions/workflow-123
```

Response includes `visualStructure` field.

## Testing Checklist

- [ ] Database migration adds `visual_structure` column
- [ ] `GET /api/workflow-definitions/{id}` returns `visualStructure` field
- [ ] `PUT /api/workflow-definitions/{id}` accepts and saves `visualStructure`
- [ ] Partial updates work (can update only `visualStructure` without other fields)
- [ ] `NULL` visual structure is handled gracefully
- [ ] Invalid JSON structure is rejected with appropriate error
- [ ] Position coordinates are validated (numbers, reasonable ranges)
- [ ] Response includes updated `visualStructure` after save

## Backward Compatibility

- Existing workflows without `visualStructure` should continue to work
- Frontend will use automatic layout as fallback
- No breaking changes to existing API contracts

## Auto-Save Behavior

The frontend automatically saves the computed layout positions to the backend when:

1. **First Time Setup**: When stages/steps are first added to a workflow that has `null` or missing `visualStructure`
2. **Automatic Population**: The layout engine computes positions, and if `visualStructure` is null, it's automatically saved to the backend
3. **Debounced**: Auto-save is debounced (500ms) to prevent multiple API calls when stages/steps are added rapidly
4. **One-Time**: Each workflow only auto-saves once - subsequent changes require manual node dragging to update positions

### Benefits for Other Applications

- **No Layout Engine Required**: Other applications consuming the API don't need to implement the layout engine
- **Consistent Structure**: All applications will see the same visual structure from the API
- **Always Available**: Once a workflow has stages/steps, `visualStructure` will be populated automatically

### Important Notes

- **Backend Should Return Empty Object**: If `visualStructure` is `null` in the database, the backend should return `{ positions: {} }` instead of `null` to maintain API contract consistency
- **Frontend Fallback**: This application has a fallback layout engine, but other applications should rely on `visualStructure` from the API
- **Manual Override**: Users can still manually drag nodes to customize positions, which will update `visualStructure` in real-time
