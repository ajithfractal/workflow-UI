# Workflow Designer UI

A visual workflow designer built with React + Vite for creating and managing workflow definitions.

## Features

- Visual drag-and-drop workflow designer using React Flow
- Create and edit workflow steps
- Configure approval types (ALL, ANY, N_OF_M)
- Add approvers to steps
- Support for parallel steps (same stepOrder)
- Form-based step configuration
- Workflow list and management

## Prerequisites

- Node.js 18+ and npm/yarn
- Spring Boot backend running on `http://localhost:8080`

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Configuration

Update the API base URL in `.env`:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

## Project Structure

```
src/
├── api/              # API client for backend
├── components/       # React components
│   ├── WorkflowDesigner/  # Main designer component
│   ├── StepForm/          # Step configuration form
│   └── WorkflowList/      # Workflow list view
├── hooks/            # Custom React hooks (Zustand store)
├── styles/           # CSS styles
└── utils/            # Utility functions (mappers, etc.)
```

## Backend API Requirements

The UI expects the following REST endpoints:

- `GET /api/workflow-definitions` - List workflows
- `POST /api/workflow-definitions` - Create workflow
- `GET /api/workflow-definitions/{id}` - Get workflow
- `POST /api/workflow-definitions/{id}/steps` - Add step
- `PUT /api/workflow-definitions/steps/{id}` - Update step
- `DELETE /api/workflow-definitions/steps/{id}` - Delete step
- `POST /api/workflow-definitions/steps/{id}/approvers` - Add approver
- `DELETE /api/workflow-definitions/approvers/{id}` - Remove approver
- `POST /api/workflow-definitions/{id}/activate` - Activate workflow
- `POST /api/workflow-definitions/{id}/deactivate` - Deactivate workflow

## Usage

1. Start the Spring Boot backend
2. Start this React app (`npm run dev`)
3. Open `http://localhost:5173` in your browser
4. Create a new workflow or edit an existing one
5. Add steps and configure approvers
6. Save the workflow

## Technologies

- React 18
- Vite
- React Flow (visual flow designer)
- Zustand (state management)
- React Hook Form (form management)
- Axios (HTTP client)
- Lucide React (icons)
