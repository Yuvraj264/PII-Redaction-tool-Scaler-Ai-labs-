# PII Redaction Tool — System Flow

This document details the operational execution flows of the PII Redaction Tool system.

---

## Component Status Overview

### [IMPLEMENTED]
- **Express Server Foundation** (`server/server.js`, `server/src/app.js`)
- **Health Check Endpoint** (`GET /api/health`)
- **DOCX Ingestion Engine & Validation** (`POST /api/documents/upload`)
- **OpenXML DOCX Structural Parser & Source Mapping** (`POST /api/documents/:documentId/parse`)
- **Deterministic PII Detection Engine** (`POST /api/documents/:documentId/detect`)
- **5 Core PII Detectors**:
  - `emailDetector.js` (**EMAIL**)
  - `phoneDetector.js` (**PHONE**)
  - `ipDetector.js` (**IP_ADDRESS**)
  - `ssnDetector.js` (**SSN**)
  - `creditCardDetector.js` (**CREDIT_CARD** with Luhn validation)
- **PII Detection Service & Overlap Resolver** (`server/src/services/piiDetectionService.js`)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated PII Detector Unit & Integration Test Suite** (`scratch/test_execution_005.js`)

### [PLANNED]
- **Synthetic Replacement & Redaction Engine** (DOCX text manipulation planned for Execution 006)
- **Evaluation & Validation Engine** (Precision/Recall metrics planned for Execution 007)
- **MongoDB Data Persistence** (Redaction job metadata & history models planned for future execution)
- **Interactive PII Review UI** (Document preview & entity toggle UI planned for future execution)

---

## FLOW-001 — Application Startup & Health Check

### Overview
Initial system boots up the Express REST API backend and React Vite frontend. The client polls the backend health status endpoint (`GET /api/health`) to confirm system readiness.

---

## FLOW-002 — DOCX Upload Flow

### Overview
Client submits a `.docx` document to the ingestion API. The server validates format and size, stores the file securely in temporary storage, generates a unique document ID, and returns safe metadata.

---

## FLOW-003 — DOCX Parsing Flow

### Overview
Parses an ingested DOCX document into a structured internal model containing paragraphs, table cells, headers, and footers with stable unit IDs (`unit-00001`) and location metadata.

---

## FLOW-004 — Extraction Verification and Source Mapping

### Overview
Validates structural text extraction, OpenXML run-level breakdown (`<w:r>`), character offset conventions (`start` inclusive, `end` exclusive), and deterministic location mapping across paragraphs, tables, headers, and footers for downstream PII targeting.

---

## FLOW-005 — Deterministic PII Detection

### Overview
Scans structured document units using 5 deterministic PII detectors (**EMAIL**, **PHONE**, **IP_ADDRESS**, **SSN**, **CREDIT_CARD** with Luhn algorithm validation), resolves overlapping spans, sorts entities deterministically, and attaches source location objects.

### Execution Details
- **Entry Point**: `POST /api/documents/:documentId/detect`
- **Input**: StructuredDocument from `documentService.parseDocument(documentId)`
- **Processing**:
  1. API request invokes `documentController.detectPii`.
  2. `piiDetectionService.detectPiiInDocument(documentId)` retrieves structured document model.
  3. Iterates over text units (`content` array):
     - Executes `emailDetector.detect(unit.text)` (**FLOW-005-A**).
     - Executes `phoneDetector.detect(unit.text)` (**FLOW-005-B**).
     - Executes `ipDetector.detect(unit.text)` (**FLOW-005-C**).
     - Executes `ssnDetector.detect(unit.text)` (**FLOW-005-D**).
     - Executes `creditCardDetector.detect(unit.text)` (**FLOW-005-E**).
  4. Aggregates candidate entities and invokes `resolveOverlaps()` (preferring longer/more specific span matches).
  5. Sorts entities deterministically by `start` asc, `end` asc, `type` alpha.
  6. Verifies invariant `unit.text.substring(start, end) === entity.text`.
  7. Attaches source location metadata (`unitId`, `tableIndex`, `rowIndex`, `cellIndex`, `paragraphIndex`).
  8. Calculates summary counts by category (`EMAIL: 52`, `PHONE: 12`, `IP_ADDRESS: 0`, `SSN: 0`, `CREDIT_CARD: 0`).
- **Output**: JSON payload:
  ```json
  {
    "success": true,
    "message": "PII detection executed successfully",
    "detection": {
      "documentId": "doc_1786622697521_f7e04c92f688",
      "summary": {
        "EMAIL": 52,
        "PHONE": 12,
        "IP_ADDRESS": 0,
        "SSN": 0,
        "CREDIT_CARD": 0,
        "totalEntities": 64
      },
      "sampleCount": 10,
      "samples": [ ... 10 sample entities with masked details & source locations ... ]
    }
  }
  ```

### FLOW-005-A — EMAIL Detector
- **Input**: Text unit string.
- **Logic**: Practical regex `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g` + trailing punctuation stripping.
- **Status**: **[IMPLEMENTED]**

### FLOW-005-B — PHONE Detector
- **Input**: Text unit string.
- **Logic**: Matches +91 Indian and international formats + context checks (`Tel`, `Telephone`, `Mobile`, `Phone`) with false positive filters rejecting 6-digit postal codes (e.g. `410 501`), financial figures, share counts, and legal CINs.
- **Status**: **[IMPLEMENTED]**

### FLOW-005-C — IP ADDRESS Detector
- **Input**: Text unit string.
- **Logic**: Matches IPv4 4-octet patterns with octet range validation (`0–255`) and version string rejection (`v1.4.5`).
- **Status**: **[IMPLEMENTED]**

### FLOW-005-D — SSN Detector
- **Input**: Text unit string.
- **Logic**: Matches US SSN candidates `XXX-XX-XXXX` with valid area/group/serial range rules. Unhyphenated 9-digit candidates require explicit context keywords (`SSN`, `Social Security`).
- **Status**: **[IMPLEMENTED]**

### FLOW-005-E — CREDIT CARD Detector
- **Input**: Text unit string.
- **Logic**: Matches 13–19 candidate digit sequences (formatted or raw) and validates them using the **Luhn Algorithm Checksum**.
- **Status**: **[IMPLEMENTED]**

### Data Flow Diagram

```
StructuredDocument (docxParserService)
  │
  ▼
PII Detection Service (server/src/services/piiDetectionService.js)
  ├─► emailDetector.js (EMAIL)
  ├─► phoneDetector.js (PHONE)
  ├─► ipDetector.js (IP_ADDRESS)
  ├─► ssnDetector.js (SSN)
  └─► creditCardDetector.js (CREDIT_CARD + Luhn Checksum)
  │
  ▼
Candidate Entity Aggregation
  │
  ▼
Overlap Resolver (resolveOverlaps)
  │
  ▼
Deterministic Entity Sorter (start asc, end asc, type alpha)
  │
  ▼
Substring Invariant Verification (unit.text.substring(start, end) === entity.text)
  │
  ▼
Source Location Attacher (unitId, tableIndex, rowIndex, cellIndex, paragraphIndex)
  │
  ▼
HTTP 200 OK JSON Response (Summary Counts + Safe Samples)
```
