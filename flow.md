# PII Redaction Tool — System Flow

This document details the operational execution flows of the PII Redaction Tool system.

---

## Component Status Overview

### [IMPLEMENTED]
- **Express Server Foundation** (`server/server.js`, `server/src/app.js`)
- **Health Check Endpoint** (`GET /api/health`)
- **DOCX Ingestion Engine & Validation** (`POST /api/documents/upload`)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Metadata Service** (`server/src/services/documentService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)

### [PLANNED]
- **DOCX Text Extraction & Paragraph Parsing** (Planned for Execution 003)
- **PII Detection Engine** (Regex + NLP / Entity recognition planned for Execution 004)
- **Synthetic Replacement & Redaction Engine** (DOCX text manipulation planned for Execution 005)
- **Evaluation & Validation Engine** (Precision/Recall metrics planned for Execution 006)
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
- **Output**: JSON payload with system health metadata.
- **Next Component**: React UI updates system badge indicator to "Online".
- **Failure Path**:
  - If backend is offline, fetch fails with Network Error.
  - Frontend catches error and updates badge indicator to "Offline (Backend Unavailable)".

---

## FLOW-002 — DOCX Upload Flow

### Overview
Client submits a `.docx` document to the ingestion API. The server validates format and size, stores the file securely in temporary storage, generates a unique document ID, and returns safe metadata.

### Execution Details
- **Entry Point**: `POST /api/documents/upload`
- **Request Format**: `multipart/form-data` with field `file`
- **Previous Component**: Interactive Drag & Drop Upload Component (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Current Component**: Document Controller (`server/src/controllers/documentController.js`)
- **Processing Steps**:
  1. User selects or drops a `.docx` file in the UI.
  2. Frontend constructs a `FormData` object containing the file under field name `file` and POSTs to `/api/documents/upload`.
  3. Vite dev proxy routes request to Express backend running on port `5001`.
  4. `documentRoutes.js` intercepts request and passes control to `uploadMiddleware.js` (`handleUpload('file')`).
  5. `uploadMiddleware.js` invokes Multer disk storage:
     - Verifies file exists.
     - Validates extension is `.docx`.
     - Validates MIME type against allowed OpenXML types.
     - Enforces maximum file size limit (50MB).
     - Generates sanitized server filename: `doc_<timestamp>_<randomHex>.docx`.
     - Saves file to isolated temporary directory `server/uploads/`.
  6. `documentController.uploadDocument` executes, invoking `documentService.processUploadedDocument(req.file)`.
  7. `documentService.js` formats document metadata (`documentId`, `originalName`, `mimeType`, `size`, `extension`, `uploadedAt`). Raw server file paths and file contents are strictly omitted.
  8. Controller returns HTTP 200 OK with metadata response payload.
- **Output**: JSON payload:
  ```json
  {
    "success": true,
    "message": "Document uploaded and ingested successfully",
    "document": {
      "documentId": "doc_1786609770017_8aa674b0a5b8",
      "originalName": "Red Herring Prospectus.docx",
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "size": 1844676,
      "extension": ".docx",
      "uploadedAt": "2026-08-13T08:29:30.022Z"
    }
  }
  ```
- **Next Component**: React Upload UI displays ingested document metadata summary card.
- **Error Paths**:
  - **No File Uploaded**: Returns HTTP 400 `{ "status": "error", "statusCode": 400, "message": "No file uploaded. Please attach a valid .docx document..." }`.
  - **Invalid File Extension (.txt, .pdf)**: Returns HTTP 400 `{ "status": "error", "statusCode": 400, "message": "Unsupported file extension..." }`.
  - **File Size Limit Exceeded (>50MB)**: Returns HTTP 413 `{ "status": "error", "statusCode": 413, "message": "File size exceeds the maximum limit of 50MB." }`.
  - **Unexpected Failure**: Caught by `errorHandler.js`, returning HTTP 500 `{ "status": "error", "statusCode": 500, "message": "Internal server error" }`.

### Data Flow Diagram

```
User Browser / UI Component
  │
  │ POST /api/documents/upload (multipart/form-data; field: file)
  ▼
Vite Dev Proxy
  │
  ▼
Express Application (server/src/app.js)
  │
  ▼
Document Routes (server/src/routes/documentRoutes.js)
  │
  ▼
Upload Middleware / Multer (server/src/middleware/uploadMiddleware.js)
  ├─► Validate File Extension (.docx) & MIME Type
  ├─► Enforce Size Limit (50MB)
  ├─► Generate Sanitized Safe Filename (doc_timestamp_random.docx)
  └─► Store in server/uploads/
  │
  ▼
Document Controller (server/src/controllers/documentController.js)
  │
  ▼
Document Service (server/src/services/documentService.js)
  │
  ▼
Metadata Response (HTTP 200 OK)
  │
  ▼
React UI (Document Metadata Card Rendered)
```
