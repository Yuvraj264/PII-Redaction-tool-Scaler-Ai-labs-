# PII Redaction Tool — System Flow

This document details the operational execution flows of the PII Redaction Tool system.

---

## Component Status Overview

### [IMPLEMENTED]
- **Express Server Foundation** (`server/server.js`, `server/src/app.js`)
- **Health Check Endpoint** (`GET /api/health`)
- **DOCX Ingestion Engine & Validation** (`POST /api/documents/upload`)
- **OpenXML DOCX Structural Parser** (`POST /api/documents/:documentId/parse`)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Metadata & Parsing Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)

### [PLANNED]
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
- **Output**: JSON payload with uploaded document metadata.

---

## FLOW-003 — DOCX Parsing Flow

### Overview
Parses an ingested DOCX document into a structured internal model containing paragraphs, table cells, headers, and footers with stable unit IDs (`unit-00001`) and location metadata.

### Execution Details
- **Entry Point**: `POST /api/documents/:documentId/parse`
- **Previous Component**: Client App / Ingestion UI / API Consumer
- **Current Component**: Document Controller (`server/src/controllers/documentController.js`) & Parser Service (`server/src/services/docxParserService.js`)
- **Processing Steps**:
  1. Client sends POST request to `/api/documents/:documentId/parse`.
  2. `documentController.parseDocument` extracts `documentId` from URL route parameters.
  3. `documentService.parseDocument(documentId)` locates the stored `.docx` file in `server/uploads/`.
  4. `docxParserService.parseDocument(filePath, documentId)` reads OpenXML archive in-memory using `adm-zip`:
     - Reads `word/document.xml`, `word/header*.xml`, `word/footer*.xml`.
     - Parses XML using `fast-xml-parser`.
     - Traverses `<w:p>` and `<w:tbl>` elements in exact document order.
  5. Formats extracted units:
     - `id`: Stable unit identifier (`unit-00001`, `unit-00002`, ...).
     - `type`: `"paragraph"`, `"table-cell"`, `"header"`, `"footer"`.
     - `text`: Raw extracted text string.
     - `normalizedText`: Normalized whitespace search string.
     - `location`: Exact index coordinates (`paragraphIndex`, `tableIndex`, `rowIndex`, `cellIndex`).
  6. Computes summary metrics (`paragraphCount`, `tableCount`, `tableCellCount`, `textUnitCount`, `totalCharacterCount`, `emptyUnitCount`).
  7. Returns HTTP 200 OK JSON response containing document metrics and safe debug preview (first 10 units with truncated text).
- **Output**: JSON payload:
  ```json
  {
    "success": true,
    "message": "Document parsed successfully",
    "document": {
      "documentId": "doc_1786610748640_d4bcdc4f93c0",
      "sourceFile": { "originalName": "Red Herring Prospectus.docx", "size": 1844676 },
      "metrics": {
        "paragraphCount": 1006,
        "tableCount": 76,
        "tableCellCount": 3225,
        "textUnitCount": 4535,
        "totalCharacterCount": 321112,
        "emptyUnitCount": 1023,
        "headerCount": 75,
        "footerCount": 74
      },
      "preview": [ ... first 10 text units ... ]
    }
  }
  ```
- **Error Paths**:
  - **Document Not Found**: Returns HTTP 404 `{ "status": "error", "statusCode": 404, "message": "Document with ID '...' not found in upload storage." }`.
  - **Corrupt / Invalid Archive**: Returns HTTP 400 `{ "status": "error", "statusCode": 400, "message": "Failed to open DOCX archive: ..." }`.

### FLOW-003-A — Paragraph Extraction
- **Input**: `<w:p>` XML nodes inside `word/document.xml`.
- **Processing**: Extracts text runs `<w:t>` inside paragraph node while preserving paragraph order.
- **Output**: Unit with `type: "paragraph"`, `location: { paragraphIndex: P_INDEX }`.
- **Status**: **[IMPLEMENTED]**

### FLOW-003-B — Table Extraction
- **Input**: `<w:tbl>` XML nodes inside `word/document.xml`.
- **Processing**: Traverses table rows `<w:tr>` and table cells `<w:tc>`, extracting paragraph text runs.
- **Output**: Unit with `type: "table-cell"`, `location: { tableIndex: T_INDEX, rowIndex: R_INDEX, cellIndex: C_INDEX, paragraphIndex: P_INDEX }`.
- **Status**: **[IMPLEMENTED]**

### FLOW-003-C — Header/Footer Extraction
- **Input**: `word/header*.xml` and `word/footer*.xml` entries inside OpenXML archive.
- **Processing**: Traverses header/footer paragraph nodes.
- **Output**: Unit with `type: "header"` or `type: "footer"`, `location: { headerId / footerId, paragraphIndex }`.
- **Status**: **[IMPLEMENTED]**

### Data Flow Diagram

```
Browser / API Consumer
  │
  │ POST /api/documents/:documentId/parse
  ▼
Express Router (server/src/routes/documentRoutes.js)
  │
  ▼
Document Controller (server/src/controllers/documentController.js)
  │
  ▼
Document Service (server/src/services/documentService.js)
  ├─► Locate stored file in server/uploads/
  └─► Invoke docxParserService.parseDocument()
        │
        ▼
DOCX Parser Service (server/src/services/docxParserService.js)
  ├─► Open ZIP Archive in-memory (adm-zip)
  ├─► Parse word/document.xml, header*.xml, footer*.xml (fast-xml-parser)
  ├─► Extract Paragraphs (<w:p>)
  ├─► Extract Table Cells (<w:tbl> -> <w:tr> -> <w:tc>)
  ├─► Extract Headers & Footers
  └─► Build Structured Document Model with Location Metadata
        │
        ▼
HTTP 200 OK JSON Response (Metrics + Safe Preview)
```
