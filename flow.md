# PII Redaction Tool — System Flow

This document details the operational execution flows of the PII Redaction Tool system.

---

## Component Status Overview

### [IMPLEMENTED]
- **Express Server Foundation** (`server/server.js`, `server/src/app.js`)
- **Health Check Endpoint** (`GET /api/health`)
- **DOCX Ingestion Engine & Validation** (`POST /api/documents/upload`)
- **OpenXML DOCX Structural Parser & Source Mapping** (`POST /api/documents/:documentId/parse`)
- **OpenXML Run-Level Breakdown (`<w:r>`) & Offset Helpers** (`server/src/services/docxParserService.js`)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Metadata & Parsing Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Comprehensive 16-Point Parser Test Harness** (`scratch/test_execution_004.js`)

### [PLANNED]
- **PII Detection Engine** (Regex + NLP / Entity recognition planned for Execution 005)
- **Synthetic Replacement & Redaction Engine** (DOCX text manipulation planned for Execution 006)
- **Evaluation & Validation Engine** (Precision/Recall metrics planned for Execution 007)
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
- **Output**: JSON payload with uploaded document metadata.

---

## FLOW-003 — DOCX Parsing Flow

### Overview
Parses an ingested DOCX document into a structured internal model containing paragraphs, table cells, headers, and footers with stable unit IDs (`unit-00001`) and location metadata.

---

## FLOW-004 — Extraction Verification and Source Mapping

### Overview
Validates structural text extraction, OpenXML run-level breakdown (`<w:r>`), character offset conventions (`start` inclusive, `end` exclusive), and deterministic location mapping across paragraphs, tables, headers, and footers for downstream PII targeting.

### Execution Details
- **Entry Point**: `POST /api/documents/:documentId/parse`
- **Input**: Ingested DOCX file in `server/uploads/`
- **Processing**:
  1. Client sends POST request to `/api/documents/:documentId/parse`.
  2. `documentService.parseDocument(documentId)` loads OpenXML file archive in-memory (`adm-zip`).
  3. `docxParserService.parseDocument` extracts:
     - **Paragraphs**: `<w:p>` nodes with paragraph indices (`paragraphIndex`).
     - **Table Cells**: `<w:tbl>` -> `<w:tr>` -> `<w:tc>` grid coordinates (`tableIndex`, `rowIndex`, `cellIndex`, `paragraphIndex`).
     - **Formatting Runs**: `<w:r>` formatting run text segments (`runs: [{ index: 0, text: "..." }]`).
     - **Headers/Footers**: `word/header*.xml` and `word/footer*.xml` sections.
  4. Applies standardized zero-indexed character offset convention (`start` inclusive, `end` exclusive), guaranteeing `unit.text.substring(start, end) === entityText`.
  5. Enforces deterministic location independence for repeated text occurrences across different document units.
- **Output**: JSON metadata response payload:
  ```json
  {
    "success": true,
    "message": "Document parsed successfully",
    "document": {
      "documentId": "doc_1786621498263_aab04b0d296c",
      "sourceFile": { "originalName": "Red Herring Prospectus.docx", "size": 1844676 },
      "metrics": {
        "paragraphCount": 1006,
        "tableCount": 76,
        "tableCellCount": 3225,
        "textUnitCount": 4535,
        "totalCharacterCount": 321112,
        "totalRunCount": 4980,
        "emptyUnitCount": 1023
      },
      "offsetConvention": {
        "type": "zero-indexed",
        "start": "inclusive",
        "end": "exclusive",
        "substringGuarantee": "unit.text.substring(start, end) === entityText"
      },
      "preview": [ ... 10 sample text units with run counts and location objects ... ]
    }
  }
  ```
- **Error Paths**:
  - **Missing Document ID**: Returns HTTP 404 `{ "status": "error", "statusCode": 404, "message": "Document with ID '...' not found..." }`.
  - **Corrupt File / Invalid OpenXML**: Returns HTTP 400 `{ "status": "error", "statusCode": 400, "message": "Failed to open DOCX archive..." }`.

### Source Mapping Model
```javascript
{
  id: "unit-00030",
  type: "table-cell",
  text: "E-mail: cs.connect@kshinternational.com; Website: www.kshinternational.com",
  normalizedText: "E-mail: cs.connect@kshinternational.com; Website: www.kshinternational.com",
  runs: [
    { index: 0, text: "E-mail: " },
    { index: 1, text: "cs.connect@kshinternational.com" },
    { index: 2, text: "; Website: www.kshinternational.com" }
  ],
  location: {
    documentId: "doc_1786621498263_aab04b0d296c",
    tableIndex: 0,
    rowIndex: 2,
    cellIndex: 3,
    paragraphIndex: 0
  }
}
```

### Character Offset Convention
- `start`: 0-indexed inclusive start position.
- `end`: 0-indexed exclusive end position.
- `unit.text.substring(start, end)` strictly evaluates to target entity string.

### Testing Flow
```
Parser Service (server/src/services/docxParserService.js)
  │
  ▼
Automated 16-Point Test Harness (scratch/test_execution_004.js)
  ├─► TEST-001: Load Valid DOCX
  ├─► TEST-002: Paragraph Extraction (> 500)
  ├─► TEST-003: Table Grid Extraction (> 10 tables, > 100 cells)
  ├─► TEST-004: Stable Sequential IDs (unit-00001)
  ├─► TEST-005: Deterministic Location Objects
  ├─► TEST-006: Substring Offset Convention Assertion
  ├─► TEST-007: Representative Person Text Search
  ├─► TEST-008: Representative Email Text Search
  ├─► TEST-009: Representative Phone Text Search
  ├─► TEST-010: Representative Company Text Search
  ├─► TEST-011: Representative Address Text Search
  ├─► TEST-012: Multi-Occurrence Independent Location Check
  ├─► TEST-013: Invalid Document ID 404 Handling
  ├─► TEST-014: Source File Read-Only Integrity Check
  ├─► TEST-015: GET /api/health Regression
  └─► TEST-016: POST /api/documents/upload Regression
```
