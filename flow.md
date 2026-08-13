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
- **Centralized Allowlist Service** (`server/src/services/allowlistService.js`)
- **PII Normalization Service** (`server/src/services/piiNormalizationService.js`)
- **PII Validation & Offset Invariant Checker** (`server/src/services/piiValidationService.js`)
- **PII Audit & Diagnostics Generator** (`server/src/services/piiAuditService.js`)
- **PII Detection Service & Overlap Resolver** (`server/src/services/piiDetectionService.js`)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated PII Detector & Audit Test Suite** (`server/tests/test_execution_007.js`)

### [PLANNED]
- **Synthetic Replacement & Redaction Engine** (DOCX text manipulation planned for Execution 008)
- **Evaluation & Validation Engine** (Precision/Recall metrics planned for Execution 009)
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

---

## FLOW-007 — Entity Normalization, Validation, Conflict Resolution & Audit

### Overview
Processes raw candidate entities emitted by all 9 detectors through a post-candidate pipeline: canonical contract formatting, offset invariant enforcement, type-specific comparison key normalization, validation layer filtering with diagnostic rejection reasons, canonical duplicate grouping, rank-based overlap resolution, and detection audit report generation.

---

### FLOW-007-A — Canonical Entity Schema
- **Entry Point**: `piiDetectionService.detectPiiInTextUnit(unit)`
- **Input**: Validated candidate entity object.
- **Processing**: Attaches unique entity ID (`entity-${unit.id}-${index}`), type, text, start, end, confidence, detector name, `normalizedValue`, and `source` metadata object (`unitId`, `unitType`, `location`).
- **Validation**: Enforces mandatory schema contract fields across all 9 detectors.
- **Output**: Canonical PII entity object.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-007-B — Entity Normalization
- **Entry Point**: `piiNormalizationService.normalize(type, text)`
- **Input**: Entity type and raw source text.
- **Processing**: Computes canonical comparison values without mutating original source `text`, `start`, or `end`:
  - `EMAIL`: Lowercase trimmed string (`cs.connect@kshinternational.com`).
  - `PHONE`: Strips spaces, hyphens, brackets, dots (`+912045053237`).
  - `CREDIT_CARD` / `SSN`: Strips spaces and hyphens (`4111111111111111`).
  - `PERSON` / `ORGANIZATION`: Collapses multiple whitespace, converts to lowercase (`ksh international limited`).
  - `ADDRESS`: Collapses line breaks and spaces, converts to lowercase.
  - `DOB`: Parses unambiguous dates to ISO `YYYY-MM-DD`.
- **Output**: Normalized string key used for canonical grouping (`canonicalKey`).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-007-C — Entity Validation & Invariant Checker
- **Entry Point**: `piiValidationService.validateCandidate(candidate, unitText)`
- **Input**: Raw candidate entity object and unit source text string.
- **Processing**: Evaluates structural schema validity, verifies non-negative offset bounds (`start >= 0`, `end > start`, `end <= unitText.length`), and enforces strict offset invariant: `unitText.substring(start, end) === candidate.text`. Runs detector-specific rules (Luhn checksum, IPv4 octet bounds, PIN/address evidence, DOB context).
- **Output**: `{ isValid: true/false, reason: string | null }`. Invalid candidates are logged to `rejectedCandidates` list.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-007-D — Duplicate Occurrence Handling
- **Entry Point**: `piiAuditService.generateAuditReport()`
- **Input**: Final validated entities array.
- **Processing**: Identical PII text appearing in distinct document locations (e.g. "KSH International Limited" in paragraph 10 and table cell 5) remains separate physical detection occurrences in the `entities` array. Occurrences sharing a `canonicalKey` (`type:normalizedValue`) are grouped in audit diagnostics (`duplicateOccurrences` count).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-007-E — Overlap Resolution
- **Entry Point**: `piiDetectionService.resolveOverlaps(entities)`
- **Input**: Validated candidate entities in a text unit.
- **Processing**: Collapses exact duplicate candidate spans `[start, end]`. Resolves nested/partially overlapping candidate spans using specificity rank hierarchy:
  1. Specificity rank (`EMAIL`/`PHONE`/`CREDIT_CARD`/`SSN`/`IP` [Rank 5] > `DOB` [Rank 4] > `ADDRESS` [Rank 3] > `PERSON` [Rank 2] > `ORGANIZATION` [Rank 1]).
  2. Higher confidence score.
  3. Longer span length.
  4. Earlier start offset.
- **Output**: Clean array of non-overlapping PII entities. Adjacent non-overlapping entities (`John Doe john@example.com`) remain separate.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-007-F — Context Validation
- **Entry Point**: Internal detector validation steps + `contextUtils.js`.
- **Input**: Surrounding character text windows.
- **Processing**: Bounded context inspection verifies preceding honorifics/roles for `PERSON`, explicit prefix labels (`Registered Office:`) for `ADDRESS`, and explicit DOB keywords (`Date of Birth:`, `DOB:`) for `DOB`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-007-G — Allowlist Processing
- **Entry Point**: `allowlistService.isAllowlisted(type, text)`
- **Input**: Candidate type and text.
- **Processing**: Queries centralized allowlist service ([allowlistService.js](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/server/src/services/allowlistService.js)) wrapping [organizationAllowlist.js](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/server/src/config/organizationAllowlist.js) to exclude statutory/regulatory bodies (`SEBI`, `BSE`, `NSE`, `RBI`), government bodies (`Government of India`), legal acts (`Companies Act`), and generic committees (`Board of Directors`).
- **Output**: Boolean flag. Rejected candidates logged with reason `ALLOWLIST_EXCLUDED`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-007-H — Detection Audit System
- **Entry Point**: `piiAuditService.generateAuditReport()`
- **Input**: Document ID, processed units, raw candidates, rejected candidates, final entities, overlaps resolved.
- **Processing**: Computes safe diagnostic stats (`processedUnits`, `candidatesGenerated`, `rejectedCandidatesCount`, `finalEntitiesCount`, `duplicateOccurrences`, `overlapsResolvedCount`, `byType`, `byDetector`, `rejectedByReason`, `canonicalEntitiesSample`).
- **Output**: Development-only diagnostic audit payload attached to `POST /api/documents/:documentId/detect` response.
- **Status**: **[IMPLEMENTED]**

---

### Comprehensive Data Flow Diagram

```
StructuredDocument (docxParserService)
  │
  ▼
PII Detection Service (server/src/services/piiDetectionService.js)
  │
  ├── 9 Detectors Execute:
  │     ├─► emailDetector.js, phoneDetector.js, ipDetector.js, ssnDetector.js, creditCardDetector.js
  │     └─► personDetector.js, organizationDetector.js, addressDetector.js, dobDetector.js
  │
  ▼
Raw Candidate Entities
  │
  ▼
Validation & Invariant Layer (piiValidationService.js & allowlistService.js)
  ├─► Schema Contract Check
  ├─► Character Offset Invariant Verification (unitText.substring(start, end) === candidate.text)
  ├─► Centralized Allowlist Exclusion Check
  └─► Detector-Specific Rules (Luhn, IPv4, PIN/Address evidence, DOB context)
  │
  ├─► [Valid Candidates] ────► Normalization Service (piiNormalizationService.js)
  │                                └── Computes normalizedValue comparison key
  │
  └─► [Invalid Candidates] ──► Logged to rejectedCandidates with Diagnostic Reason
  │
  ▼
Overlap Resolver (resolveOverlaps by Rank: Specificity > Confidence > Length > Start)
  │
  ▼
Deterministic Entity Sorter (start asc, end asc, type alpha)
  │
  ▼
Canonical Contract Formatting (assigns unique id, text, start, end, normalizedValue, source metadata)
  │
  ▼
Detection Audit Generator (piiAuditService.js)
  └── Computes processedUnits, candidatesGenerated, rejectedByReason, duplicateOccurrences, canonicalEntities
  │
  ▼
HTTP 200 OK JSON Response (Summary Counts + Audit Report + Safe Samples)
```
