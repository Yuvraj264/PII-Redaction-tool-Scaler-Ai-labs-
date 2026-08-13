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
- **Synthetic Replacement Mapping Subsystem**:
  - `replacementRegistry.js` (Bidirectional canonicalKey ↔ replacement mapping with collision prevention)
  - `replacementService.js` (Replacement Plan builder & API service)
  - **9 Type-Specific Synthetic Generators**: `personGenerator.js`, `emailGenerator.js`, `phoneGenerator.js`, `organizationGenerator.js`, `addressGenerator.js`, `dobGenerator.js`, `ssnGenerator.js`, `creditCardGenerator.js`, `ipGenerator.js`
- **OpenXML DOCX Redaction Engine** (`server/src/services/docxRedactionService.js` - `POST /api/documents/:documentId/redact`)
- **Post-Redaction PII Leakage Scanner Subsystem**:
  - `leakageScanner.js` (Reparse & 9-category rescan orchestrator)
  - `leakageAnalyzer.js` (Residual entity classifier for Categories A-D)
  - `leakageReport.js` (Leakage report assembler - `POST /api/documents/:documentId/verify-redaction`)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated PII Detector, Audit, Replacement & Leakage Test Suite** (`server/tests/test_execution_010.js`)

### [PLANNED — NOT IMPLEMENTED]
- **Formal Precision/Recall Benchmark Evaluation Engine** (Gold-standard benchmark evaluation planned for future execution)
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

## FLOW-008 — Synthetic PII Replacement Mapping

### Overview
Maps validated PII entities to realistic synthetic alternatives, guarantees 1-to-1 consistency for repeated entity occurrences, prevents synthetic replacement collisions, and generates a structured, descending-offset sorted Replacement Plan without modifying source DOCX files.

---

## FLOW-010 — Post-Redaction PII Leakage Verification

### Overview
Performs independent post-redaction safety verification by reparsing generated redacted `.docx` files into structured text units, executing all 9 PII detectors, classifying residual entity findings into 4 distinct categories (A-D), checking direct exact/normalized original PII strings, verifying structural paragraph/table integrity, and compiling diagnostic Leakage Reports.

---

### FLOW-010-A — Redacted DOCX Reparse
- **Entry Point**: `docxParserService.parseDocument(redactedFilePath, documentId)`
- **Input**: Absolute path to generated redacted `.docx` archive (`server/uploads/:documentId_redacted.docx`).
- **Processing**: Unzips archive, parses `word/document.xml`, `word/header*.xml`, `word/footer*.xml`, and extracts structured text units into memory.
- **Validation**: Verifies file openability and XML well-formedness.
- **Output**: Reparsed Structured Document Model.
- **Failure Path**: Returns report status `FAIL` if unzipping or XML parsing fails.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-010-B — Full PII Rescan
- **Entry Point**: `piiDetectionService.detectPiiInUnits(redactedDoc.content, documentId)`
- **Input**: Reparsed text units array.
- **Processing**: Runs all 9 detectors (**EMAIL**, **PHONE**, **IP_ADDRESS**, **SSN**, **CREDIT_CARD**, **PERSON**, **ORGANIZATION**, **ADDRESS**, **DOB**) against every reparsed text unit.
- **Output**: Raw rescan candidate entities array.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-010-C — Original Entity Comparison
- **Entry Point**: `leakageAnalyzer.classifyFinding()` original entity matching.
- **Input**: Candidate entity text and `originalPiiNormalizedSet`.
- **Processing**: Verifies whether candidate entity text or normalized comparison key matches an unredacted original PII value.
- **Output**: Boolean match flag.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-010-D — Synthetic Replacement Classification
- **Entry Point**: `leakageAnalyzer.classifyFinding()` synthetic replacement matching.
- **Input**: Candidate entity text and `syntheticReplacementsSet`.
- **Processing**: Identifies if a detected candidate entity (e.g. "Arjun Mehta" detected as `PERSON` or "arjun.mehta@example.com" detected as `EMAIL`) is an expected synthetic replacement generated by the replacement engine.
- **Output**: Classifies finding as `EXPECTED_SYNTHETIC_ENTITY` with `expectedSynthetic: true` and `severity: LOW` without failing the audit.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-010-E — Residual PII Classification
- **Entry Point**: `leakageAnalyzer.classifyFinding()`
- **Input**: Rescan candidate entity.
- **Processing**: Classifies finding into one of 4 categories:
  - **CATEGORY A — EXPECTED_SYNTHETIC_ENTITY**: Synthetic replacement detected (`severity: LOW`).
  - **CATEGORY B — CONFIRMED_LEAK**: Original PII value (raw or normalized) detected in redacted output (`severity: CRITICAL`).
  - **CATEGORY C — NEW_UNINTENDED_PII**: Unintended sensitive value produced during replacement (`severity: HIGH`).
  - **CATEGORY D — SCANNER_FALSE_POSITIVE**: False positive on non-PII term (`severity: LOW`).
- **Output**: Category tag & severity.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-010-F — Leakage Severity & Status Determination
- **Entry Point**: `leakageReportBuilder.buildReport()`
- **Input**: Classified findings array and structural validation results.
- **Processing**: Computes final report status:
  - `status: "PASS"`: If `confirmedLeaksCount === 0` AND `reparsedSuccessfully === true`.
  - `status: "FAIL"`: If `confirmedLeaksCount > 0` OR `reparsedSuccessfully === false`.
- **Output**: Final status string (`PASS` or `FAIL`).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-010-G — Structural Validation
- **Entry Point**: `leakageScanner.scanRedactedDocument()` structural comparison step.
- **Input**: Original vs Redacted structured document models.
- **Processing**: Compares `originalParagraphs` vs `redactedParagraphs` and `originalTables` vs `redactedTables` to confirm document structural integrity.
- **Output**: `structuralValidation` object.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-010-H — Diagnostic Leakage Report Generation
- **Entry Point**: `POST /api/documents/:documentId/verify-redaction`
- **Input**: Document ID.
- **Processing**: Executes `leakageScanner.scanRedactedDocument(documentId)` and returns structured JSON report.
- **Output**: HTTP 200 OK JSON response containing safe summary metrics and leak lists.
- **Status**: **[IMPLEMENTED]**

---

### Comprehensive Data Flow Diagram

```
Redacted DOCX Archive (docxRedactionService.js)
  │
  ▼
Reparse Engine (docxParserService.js)
  │
  ▼
Reparsed Text Units
  │
  ▼
All 9 PII Detectors Rescan (piiDetectionService.js)
  │
  ▼
Candidate Entities
  │
  ▼
Residual Entity Classifier (leakageAnalyzer.js)
  ├─► Matches Synthetic Replacement Set? ──► CATEGORY A: EXPECTED_SYNTHETIC_ENTITY (PASS)
  ├─► Matches Original PII Set? ───────────► CATEGORY B: CONFIRMED_LEAK (FAIL - CRITICAL)
  ├─► Unintended Deterministic PII? ────────► CATEGORY C: NEW_UNINTENDED_PII (HIGH)
  └─► Allowlisted / Non-PII Term? ──────────► CATEGORY D: SCANNER_FALSE_POSITIVE (LOW)
  │
  ▼
Structural Validation Engine (originalParagraphs vs redactedParagraphs, originalTables vs redactedTables)
  │
  ▼
Diagnostic Leakage Report (POST /api/documents/:documentId/verify-redaction)
  └── Returns status: PASS / FAIL + Safe Metadata Summary Metrics + Leaks List
```
