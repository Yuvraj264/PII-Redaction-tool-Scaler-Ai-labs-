# PII Redaction Tool — System Flow

This document details the operational execution flows of the PII Redaction Tool system.

---

## Component Status Overview

### [IMPLEMENTED]
- **Express Server Foundation** (`server/server.js`, `server/src/app.js`)
- **Health Check Endpoint** (`GET /api/health`)
- **Environment Configuration Manager** (`server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Document Upload Placeholder Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)

### [PLANNED]
- **DOCX Parser / Document Ingestion Engine** (Planned for future execution)
- **PII Detection Engine** (Regex + NLP / Entity recognition planned for future execution)
- **Redaction Engine** (DOCX text manipulation & synthetic replacement planned for future execution)
- **Evaluation & Validation Engine** (Precision/Recall metrics planned for future execution)
- **MongoDB Data Persistence** (Redaction job metadata & history models planned for future execution)
- **Interactive PII Review UI** (Document preview & entity toggle UI planned for future execution)

---

## FLOW-001 — Application Startup & Health Check

### Overview
Initial system boots up the Express REST API backend and React Vite frontend. The client polls the backend health status endpoint (`GET /api/health`) to confirm system readiness.

### Execution Details
- **Entry Point**: User opens browser at `http://localhost:5173` OR direct API call to `http://localhost:5001/api/health`
- **Previous Component**: User Browser / Client Application Shell
- **Current Component**: Health Controller (`server/src/controllers/healthController.js`)
- **Processing Steps**:
  1. Frontend sends HTTP GET request to `/api/health`.
  2. Vite dev proxy routes `/api/health` to Express server running on port `5001`.
  3. Express router matches `/api/health` in `healthRoutes.js`.
  4. `healthController.getHealthStatus` executes, retrieving system uptime, timestamp, and service status.
  5. Controller sends a JSON response with status code `200 OK`.
- **Output**: JSON payload:
  ```json
  {
    "status": "ok",
    "service": "PII Redaction Engine API",
    "timestamp": "2026-08-13T13:33:45.000Z",
    "uptime": 12.45
  }
  ```
- **Next Component**: React UI updates system badge indicator to "Online".
- **Failure Path**:
  - If backend is offline, fetch fails with Network Error.
  - Frontend catches error and updates badge indicator to "Offline (Backend Unavailable)".
  - 404 Route handler catches unrecognized paths (`/api/*`) and returns structured `{ status: 404, message: "Route not found" }`.
  - Global Error Middleware catches unhandled controller exceptions and returns `{ status: 500, message: "Internal server error" }`.

### Data Flow Diagram

```
User Browser
  │
  ▼
React Application Shell (client/src/App.jsx)
  │
  │ HTTP GET /api/health
  ▼
Express Dev Proxy / Web Server
  │
  ▼
Express Application (server/src/app.js)
  │
  ▼
Health Router (server/src/routes/healthRoutes.js)
  │
  ▼
Health Controller (server/src/controllers/healthController.js)
  │
  ▼
JSON Response { status: "ok", service: "PII Redaction Engine API", ... }
  │
  ▼
React Application Shell (UI State Updated to "System Operational")
```
