# API Changes for Frontend Integration

## Overview
This document lists all API changes related to the workflow stages feature implementation. The workflow hierarchy has been restructured from **Workflow → Steps** to **Workflow → Stages → Steps**.

---

## 🗑️ DELETED APIs

### 1. Create Step Directly Against Workflow
**Endpoint:** `POST /api/workflow-definitions/{workflowId}/steps`

**Status:** ❌ **REMOVED**

**Previous Usage:**
```http
POST /api/workflow-definitions/{workflowId}/steps?createdBy=admin
Content-Type: application/json

{
  "stepName": "Credit Check",
  "stepOrder": 1,
  "approvalType": "ALL",
  "minApprovals": 1,
  "slaHours": 24,
  "approvers": [...]
}
```

**Action Required:** Use the new stage-based endpoint instead (see Created APIs section).

---

## 📝 UPDATED APIs

### 1. Get Workflow Definition
**Endpoint:** `GET /api/workflow-definitions/{workflowId}`

**Status:** ⚠️ **RESPONSE STRUCTURE CHANGED**

**Previous Response Structure:**
```json
{
  "workflowId": "uuid",
  "name": "Loan Approval",
  "version": 1,
  "isActive": true,
  "steps": [
    {
      "stepId": "uuid",
      "stepName": "Credit Check",
      "stepOrder": 1,
      "approvalType": "ALL",
      "minApprovals": 1,
      "slaHours": 24,
      "approvers": [...]
    }
  ]
}
```

**New Response Structure:**
```json
{
  "workflowId": "uuid",
  "name": "Loan Approval",
  "version": 1,
  "isActive": true,
  "stages": [
    {
      "stageId": "uuid",
      "stageName": "Initial Assessment",
      "stageOrder": 1,
      "stepCompletionType": "ALL",
      "minStepCompletions": null,
      "steps": [
        {
          "stepId": "uuid",
          "stepName": "Credit Check",
          "stepOrder": 1,
          "approvalType": "ALL",
          "minApprovals": 1,
          "slaHours": 24,
          "approvers": [...]
        }
      ]
    }
  ]
}
```

**Changes:**
- ❌ Removed: `steps` (top-level array)
- ✅ Added: `stages` (array containing stages)
- ✅ Steps are now nested inside stages

**Frontend Action Required:**
- Update all code that accesses `workflow.steps` to use `workflow.stages[].steps`
- Update UI components to display stages first, then steps within each stage

---

### 2. Update Step Definition
**Endpoint:** `PUT /api/workflow-definitions/steps/{stepId}`

**Status:** ⚠️ **REQUEST BODY CHANGED**

**Previous Request Body:**
```json
{
  "stepName": "Credit Check",
  "stepOrder": 1,  // ❌ This field is now removed
  "approvalType": "ALL",
  "minApprovals": 1,
  "slaHours": 24,
  "approvers": [...]
}
```

**New Request Body:**
```json
{
  "stepName": "Credit Check",
  "stepOrder": 1,  // Required: Steps with same stepOrder run in parallel, different stepOrder run sequentially
  "approvalType": "ALL",
  "minApprovals": 1,
  "slaHours": 24,
  "approvers": [...]
}
```

**Changes:**
- ✅ `stepOrder` is now **required** (no auto-assignment)
- ✅ Steps with the same `stepOrder` run in parallel
- ✅ Steps with different `stepOrder` run sequentially
- ✅ No shifting logic - use stepOrder value as-is

**Frontend Action Required:**
- `stepOrder` is required - must always be provided
- For parallel steps: Use the same `stepOrder` value
- For sequential steps: Use different `stepOrder` values (1, 2, 3, etc.)

---

## ✨ CREATED APIs

### 1. Create Stage
**Endpoint:** `POST /api/workflow-definitions/{workflowId}/stages`

**Status:** ✅ **NEW**

**Request:**
```http
POST /api/workflow-definitions/{workflowId}/stages?createdBy=admin
Content-Type: application/json

{
  "stageName": "Initial Assessment",
  "stageOrder": 1,
  "stepCompletionType": "ALL",  // Options: "ALL", "ANY", "N_OF_M"
  "minStepCompletions": null,    // Required only if stepCompletionType is "N_OF_M"
  "steps": [                      // Optional: can create steps during stage creation
    {
      "stepName": "Credit Check",
      "approvalType": "ALL",
      "minApprovals": 1,
      "slaHours": 24,
      "approvers": [
        {
          "approverType": "USER",
          "approverValue": "credit.analyst@bank.com"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "id": "stage-uuid",
  "message": "Stage created successfully"
}
```

**stepCompletionType Values:**
- `ALL`: All steps in the stage must complete (sequential execution)
- `ANY`: Any step completion completes the stage (parallel execution)
- `N_OF_M`: Minimum number of steps must complete (parallel execution, requires `minStepCompletions`)

---

### 2. Update Stage
**Endpoint:** `PUT /api/workflow-definitions/stages/{stageId}`

**Status:** ✅ **NEW**

**Request:**
```http
PUT /api/workflow-definitions/stages/{stageId}?updatedBy=admin
Content-Type: application/json

{
  "stageName": "Initial Assessment",
  "stageOrder": 1,
  "stepCompletionType": "ALL",
  "minStepCompletions": null
}
```

**Response:** `204 No Content`

---

### 3. Delete Stage
**Endpoint:** `DELETE /api/workflow-definitions/stages/{stageId}`

**Status:** ✅ **NEW**

**Request:**
```http
DELETE /api/workflow-definitions/stages/{stageId}
```

**Response:** `204 No Content`

**Note:** Deleting a stage also deletes all steps within that stage.

---

### 4. Add Step to Stage
**Endpoint:** `POST /api/workflow-definitions/stages/{stageId}/steps`

**Status:** ✅ **NEW**

**Request:**
```http
POST /api/workflow-definitions/stages/{stageId}/steps?createdBy=admin
Content-Type: application/json

{
  "stepName": "Credit Check",
  "stepOrder": 1,  // Required: Steps with same stepOrder run in parallel, different stepOrder run sequentially
  "approvalType": "ALL",
  "minApprovals": 1,
  "slaHours": 24,
  "approvers": [                    // Optional
    {
      "approverType": "USER",
      "approverValue": "credit.analyst@bank.com"
    }
  ]
}
```

**Response:**
```json
{
  "id": "step-uuid",
  "message": "Step created successfully"
}
```

**Step Ordering:**
- `stepOrder` is **required** (no auto-assignment)
- Steps with the same `stepOrder` run in parallel
- Steps with different `stepOrder` run sequentially
- No shifting logic - use stepOrder value as-is

**Examples:**
```json
// Sequential steps
{ "stepName": "Step 1", "stepOrder": 1, ... }
{ "stepName": "Step 2", "stepOrder": 2, ... }
{ "stepName": "Step 3", "stepOrder": 3, ... }

// Parallel steps (same order)
{ "stepName": "Credit Check", "stepOrder": 1, ... }
{ "stepName": "Fraud Check", "stepOrder": 1, ... }  // Same order = parallel
{ "stepName": "Final Review", "stepOrder": 2, ... }  // Different order = sequential after parallel
```

---

## 📋 UNCHANGED APIs

The following APIs remain unchanged:

1. ✅ `GET /api/workflow-definitions` - List all workflows
2. ✅ `POST /api/workflow-definitions` - Create workflow
3. ✅ `PUT /api/workflow-definitions/{workflowId}` - Update workflow
4. ✅ `DELETE /api/workflow-definitions/{workflowId}` - Delete workflow
5. ✅ `PUT /api/workflow-definitions/steps/{stepId}` - Update step (request body changed, see above)
6. ✅ `DELETE /api/workflow-definitions/steps/{stepId}` - Delete step
7. ✅ `POST /api/workflow-definitions/steps/{stepId}/approvers` - Add approvers to step
8. ✅ `DELETE /api/workflow-definitions/approvers/{approverId}` - Remove approver
9. ✅ `POST /api/workflow-definitions/{workflowId}/activate` - Activate workflow
10. ✅ `POST /api/workflow-definitions/{workflowId}/deactivate` - Deactivate workflow

---

## 🔄 Migration Guide for Frontend

### Step 1: Update Workflow Display
**Before:**
```javascript
workflow.steps.map(step => ...)
```

**After:**
```javascript
workflow.stages.flatMap(stage => stage.steps.map(step => ...))
// OR
workflow.stages.forEach(stage => {
  stage.steps.forEach(step => {
    // Render step
  });
});
```

### Step 2: Update Step Creation Flow
**Before:**
```javascript
POST /api/workflow-definitions/{workflowId}/steps
{
  stepName: "...",
  stepOrder: 1,  // ❌ Remove this
  ...
}
```

**After:**
```javascript
// First create a stage (if not exists)
POST /api/workflow-definitions/{workflowId}/stages
{
  stageName: "Stage 1",
  stageOrder: 1,
  stepCompletionType: "ALL",
  steps: [...]  // Can create steps here
}

// OR add step to existing stage
POST /api/workflow-definitions/stages/{stageId}/steps
{
  stepName: "...",
  stepOrder: 1,  // Required: same order = parallel, different order = sequential
  ...
}
```

### Step 3: Update Step Update Forms
**Before:**
```javascript
{
  stepName: "...",
  stepOrder: 1,  // Required
  approvalType: "...",
  ...
}
```

**After:**
```javascript
{
  stepName: "...",
  stepOrder: 1,  // Required: same order = parallel, different order = sequential
  approvalType: "...",
  ...
}
```

**Note:** 
- `stepOrder` is required - no auto-assignment
- Steps with the same `stepOrder` run in parallel
- Steps with different `stepOrder` run sequentially

### Step 4: Add Stage Management UI
Create new UI components for:
- Stage creation form
- Stage list/display
- Stage update form
- Stage deletion

---

## 📊 Complete API Reference

### Workflow Management
- `GET /api/workflow-definitions` - List workflows
- `POST /api/workflow-definitions` - Create workflow
- `GET /api/workflow-definitions/{workflowId}` - Get workflow (response structure changed)
- `PUT /api/workflow-definitions/{workflowId}` - Update workflow
- `DELETE /api/workflow-definitions/{workflowId}` - Delete workflow
- `POST /api/workflow-definitions/{workflowId}/activate` - Activate workflow
- `POST /api/workflow-definitions/{workflowId}/deactivate` - Deactivate workflow

### Stage Management (NEW)
- `POST /api/workflow-definitions/{workflowId}/stages` - Create stage
- `PUT /api/workflow-definitions/stages/{stageId}` - Update stage
- `DELETE /api/workflow-definitions/stages/{stageId}` - Delete stage

### Step Management
- `POST /api/workflow-definitions/stages/{stageId}/steps` - Add step to stage (NEW)
- `PUT /api/workflow-definitions/steps/{stepId}` - Update step (request body changed)
- `DELETE /api/workflow-definitions/steps/{stepId}` - Delete step

### Approver Management
- `POST /api/workflow-definitions/steps/{stepId}/approvers` - Add approvers
- `DELETE /api/workflow-definitions/approvers/{approverId}` - Remove approver

---

## ⚠️ Breaking Changes Summary

1. **Response Structure:** `GET /api/workflow-definitions/{workflowId}` now returns `stages` instead of `steps`
2. **Step Creation:** Cannot create steps directly against workflow - must use stages
3. **Step Update:** `stepOrder` field removed from step update request
4. **Removed Endpoint:** `POST /api/workflow-definitions/{workflowId}/steps` is no longer available

---

## 📝 Example: Creating a Complete Workflow

### New Workflow Creation Flow:

```javascript
// 1. Create workflow
POST /api/workflow-definitions?createdBy=admin
{
  "name": "Loan Approval",
  "version": 1
}
// Returns: { id: "workflow-uuid" }

// 2. Create Stage 1
POST /api/workflow-definitions/{workflowId}/stages?createdBy=admin
{
  "stageName": "Initial Assessment",
  "stageOrder": 1,
  "stepCompletionType": "ALL",
  "steps": [
    {
      "stepName": "Credit Check",
      "approvalType": "ALL",
      "minApprovals": 1,
      "slaHours": 24,
      "approvers": [
        {
          "approverType": "USER",
          "approverValue": "credit.analyst@bank.com"
        }
      ]
    },
    {
      "stepName": "Income Verification",
      "approvalType": "ALL",
      "minApprovals": 1,
      "slaHours": 48,
      "approvers": [
        {
          "approverType": "USER",
          "approverValue": "income.verify@bank.com"
        }
      ]
    }
  ]
}
// Returns: { id: "stage-1-uuid" }

// 3. Create Stage 2
POST /api/workflow-definitions/{workflowId}/stages?createdBy=admin
{
  "stageName": "Risk Assessment",
  "stageOrder": 2,
  "stepCompletionType": "N_OF_M",
  "minStepCompletions": 2,
  "steps": [
    {
      "stepName": "Collateral Evaluation",
      "approvalType": "N_OF_M",
      "minApprovals": 2,
      "slaHours": 72,
      "approvers": [
        { "approverType": "USER", "approverValue": "appraiser1@bank.com" },
        { "approverType": "USER", "approverValue": "appraiser2@bank.com" },
        { "approverType": "USER", "approverValue": "appraiser3@bank.com" }
      ]
    }
  ]
}
// Returns: { id: "stage-2-uuid" }

// 4. Add more steps to Stage 2 if needed
POST /api/workflow-definitions/stages/{stage-2-uuid}/steps?createdBy=admin
{
  "stepName": "Fraud Detection",
  "approvalType": "ALL",
  "minApprovals": 1,
  "slaHours": 24,
  "approvers": [
    {
      "approverType": "USER",
      "approverValue": "fraud.analyst@bank.com"
    }
  ]
}
```

---

## 🎯 Quick Reference

| Action | Old Endpoint | New Endpoint |
|--------|-------------|--------------|
| Create Step | ❌ `POST /{workflowId}/steps` | ✅ `POST /stages/{stageId}/steps` |
| Get Workflow | ✅ `GET /{workflowId}` | ✅ `GET /{workflowId}` (response changed) |
| Update Step | ✅ `PUT /steps/{stepId}` | ✅ `PUT /steps/{stepId}` (request changed) |
| Create Stage | ❌ N/A | ✅ `POST /{workflowId}/stages` |
| Update Stage | ❌ N/A | ✅ `PUT /stages/{stageId}` |
| Delete Stage | ❌ N/A | ✅ `DELETE /stages/{stageId}` |

---

**Last Updated:** After stages feature implementation
**Base URL:** `/api/workflow-definitions`
