# PII Redaction Tool — System Flow

This document details the operational execution flows of the PII Redaction Tool system.

---

## Component Status Overview

### [IMPLEMENTED]
- **Express Server Foundation** (`server/server.js`, `server/src/app.js`)
- **Health Check Endpoint** (`GET /api/health`)
- **DOCX Ingestion Engine & Validation** (`POST /api/documents/upload`)
- **OpenXML DOCX Structural Parser & Source Mapping** (`POST /api/documents/:documentId/parse`)
- **Full PII Detection Engine (9 Entity Categories)** (`POST /api/documents/:documentId/detect`)
- **5 Core Deterministic PII Detectors**:
  - `emailDetector.js` (**EMAIL**)
  - `phoneDetector.js` (**PHONE**)
  - `ipDetector.js` (**IP_ADDRESS**)
  - `ssnDetector.js` (**SSN**)
  - `creditCardDetector.js` (**CREDIT_CARD** with Luhn validation)
- **4 Contextual / NLP PII Detectors**:
  - `personDetector.js` (**PERSON** via local NLP + title context + false positive filters)
  - `organizationDetector.js` (**ORGANIZATION** via corporate suffixes + allowlist filtering)
  - `addressDetector.js` (**ADDRESS** via multi-component location rules & PIN matching)
  - `dobDetector.js` (**DOB** via explicit DOB context keyword matching & date parsers)
- **Organization Allowlist Manager** (`server/src/config/organizationAllowlist.js`)
- **Context Window & Inspection Helpers** (`server/src/utils/contextUtils.js`)
- **PII Detection Service & Overlap Resolver** (`server/src/services/piiDetectionService.js`)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated PII Detector Unit & Integration Test Suite** (`server/tests/test_execution_006.js`)

### [PLANNED]
- **Synthetic Replacement & Redaction Engine** (DOCX text manipulation planned for Execution 007)
- **Evaluation & Validation Engine** (Precision/Recall metrics planned for Execution 008)
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

---

## FLOW-006 — Contextual and NLP PII Detection

### Overview
Scans structured document units across 4 contextual & local NLP PII detectors (**PERSON**, **ORGANIZATION**, **ADDRESS**, **DOB**), applies false positive filtering, evaluates context windows, filters against regulatory allowlists, resolves entity overlaps, and attaches source location objects.

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
     - Executes `personDetector.detect(unit.text)` (**FLOW-006-A**).
     - Executes `organizationDetector.detect(unit.text)` (**FLOW-006-B**).
     - Executes `addressDetector.detect(unit.text)` (**FLOW-006-C**).
     - Executes `dobDetector.detect(unit.text)` (**FLOW-006-D**).
  4. Candidate entities undergo contextual validation and allowlist filtering (**FLOW-006-E**).
  5. Aggregates candidate entities across all 9 detectors and invokes `resolveOverlaps()` with priority rank rules (**FLOW-006-F**).
  6. Sorts entities deterministically by `start` asc, `end` asc, `type` alpha.
  7. Verifies invariant `unit.text.substring(start, end) === entity.text`.
  8. Attaches source location metadata (`unitId`, `tableIndex`, `rowIndex`, `cellIndex`, `paragraphIndex`).
  9. Returns total entity counts and safe masked sample entity list.

---

### FLOW-006-A — PERSON Detector
- **Entry Point**: `personDetector.detect(text)`
- **Input**: Plain text string of structured unit.
- **Processing**: Local NLP entity extraction via `compromise` + title-case regex patterns + honorific matchers (`Mr.`, `Mrs.`, `Dr.`, `Shri`) + role context inspection (`Company Secretary`, `Promoter`, `Director`).
- **Validation**: Filtered against non-person keywords (`LIMITED`, `BOARD`, `COMMITTEE`, `ACT`, `SECTION`) and section headings.
- **Output**: Array of `PERSON` candidate entities with confidence scores (0.85 - 0.95).
- **Next Component**: `piiDetectionService.resolveOverlaps()`
- **Failure Path**: Returns empty array on empty input or validation failure.
- **False Positive Strategy**: Rejects organization names, single-word capitalized words without honorific, section titles, and allowlisted entities.
- **Current Status**: **[IMPLEMENTED]**

---

### FLOW-006-B — ORGANIZATION Detector
- **Entry Point**: `organizationDetector.detect(text)`
- **Input**: Plain text string of structured unit.
- **Processing**: Capitalized company name token regex matching corporate suffixes (`Limited`, `Private Limited`, `Pvt. Ltd.`, `LLP`, `Corporation`, `Inc.`, `Industries`, `Technologies`, `Bank`, `Trust`) + `compromise` NLP org extraction.
- **Validation**: Filtered against `organizationAllowlist.js` (`SEBI`, `BSE`, `NSE`, `RBI`, `Government of India`, `Companies Act`, `Board of Directors`).
- **Output**: Array of `ORGANIZATION` candidate entities with confidence scores (0.85 - 0.95).
- **Next Component**: `piiDetectionService.resolveOverlaps()`
- **Failure Path**: Returns empty array on empty input or allowlist match.
- **False Positive Strategy**: Excludes statutory/regulatory authorities, legal acts, and generic governance committees via allowlist.
- **Current Status**: **[IMPLEMENTED]**

---

### FLOW-006-C — ADDRESS Detector
- **Entry Point**: `addressDetector.detect(text)`
- **Input**: Plain text string of structured unit.
- **Processing**: Explicit address prefix label detection (`Registered Office:`, `Corporate Office:`, `Address:`) + multi-component location pattern matching (street/village/tower + city + state + 6-digit PIN code).
- **Validation**: Evaluates location evidence score. Requires 2+ location keywords or valid PIN code. Rejects isolated city/state names ("Mumbai", "Maharashtra").
- **Output**: Array of `ADDRESS` candidate entities with confidence scores (0.90 - 0.95).
- **Next Component**: `piiDetectionService.resolveOverlaps()`
- **Failure Path**: Returns empty array on low evidence score or single location word.
- **False Positive Strategy**: Requires multi-part location evidence or explicit label; rejects standalone city/state words.
- **Current Status**: **[IMPLEMENTED]**

---

### FLOW-006-D — DOB Detector
- **Entry Point**: `dobDetector.detect(text)`
- **Input**: Plain text string of structured unit.
- **Processing**: Strict contextual DOB prefix label matching (`Date of Birth:`, `DOB:`, `Birth Date:`, `Born:`) followed by date string parsing (`DD/MM/YYYY`, `DD-MM-YYYY`, `Month DD, YYYY`).
- **Validation**: Validates calendar date and birth year range (1920 to current year). Isolates ONLY date string as entity span. Rejects fiscal periods (`FY 2024-25`).
- **Output**: Array of `DOB` candidate entities with confidence score (0.95).
- **Next Component**: `piiDetectionService.resolveOverlaps()`
- **Failure Path**: Returns empty array if date lacks explicit DOB context keyword.
- **False Positive Strategy**: Strictly requires DOB context keyword within 30-char window preceding date.
- **Current Status**: **[IMPLEMENTED]**

---

### FLOW-006-E — Context Validation & Allowlisting
- **Entry Point**: Internal detector filtering steps.
- **Input**: Raw candidate entity spans.
- **Processing**: Evaluates surrounding context windows (`getSurroundingContext`), checks role/title indicators, strips leading/trailing punctuation, and enforces allowlist exclusions.
- **Output**: Validated candidate entities.
- **Current Status**: **[IMPLEMENTED]**

---

### FLOW-006-F — Entity Merge & Overlap Resolution
- **Entry Point**: `piiDetectionService.resolveOverlaps(entities)`
- **Input**: Combined raw candidates from all 9 detectors.
- **Processing**: Resolves overlapping candidate spans `[start, end]` using priority rank rules:
  1. Specificity rank (`EMAIL`/`PHONE`/`CREDIT_CARD`/`SSN`/`IP` [Rank 5] > `DOB` [Rank 4] > `ADDRESS` [Rank 3] > `PERSON` [Rank 2] > `ORGANIZATION` [Rank 1]).
  2. Higher confidence score.
  3. Longer span length.
  4. Earlier start offset.
- **Output**: Clean list of non-overlapping PII entities.
- **Current Status**: **[IMPLEMENTED]**

---

### Comprehensive Data Flow Diagram

```
StructuredDocument (docxParserService)
  │
  ▼
PII Detection Service (server/src/services/piiDetectionService.js)
  │
  ├── Deterministic Detectors:
  │     ├─► emailDetector.js (EMAIL)
  │     ├─► phoneDetector.js (PHONE)
  │     ├─► ipDetector.js (IP_ADDRESS)
  │     ├─► ssnDetector.js (SSN)
  │     └─► creditCardDetector.js (CREDIT_CARD + Luhn Checksum)
  │
  └── Contextual / NLP Detectors:
        ├─► personDetector.js (PERSON via local NLP + title context)
        ├─► organizationDetector.js (ORGANIZATION + allowlist filtering)
        ├─► addressDetector.js (ADDRESS via location rules & PIN code)
        └─► dobDetector.js (DOB via explicit context keyword matching)
  │
  ▼
Candidate Entity Aggregation
  │
  ▼
Validation Layer & Context Window Inspection (contextUtils.js, organizationAllowlist.js)
  │
  ▼
Overlap Resolver (resolveOverlaps by Rank: Specificity > Confidence > Length > Start)
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
HTTP 200 OK JSON Response (Summary Counts across 9 Categories + Safe Samples)
```
