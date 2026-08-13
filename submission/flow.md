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
- **5 Core Deterministic PII Detectors**: `emailDetector.js`, `phoneDetector.js`, `ipDetector.js`, `ssnDetector.js`, `creditCardDetector.js`
- **4 Contextual / NLP PII Detectors**: `personDetector.js`, `organizationDetector.js`, `addressDetector.js`, `dobDetector.js`
- **Centralized Allowlist Service** (`server/src/services/allowlistService.js`)
- **PII Normalization Service** (`server/src/services/piiNormalizationService.js`)
- **PII Validation & Offset Invariant Checker** (`server/src/services/piiValidationService.js`)
- **PII Audit & Diagnostics Generator** (`server/src/services/piiAuditService.js`)
- **PII Detection Service & Overlap Resolver** (`server/src/services/piiDetectionService.js`)
- **Synthetic Replacement Mapping Subsystem**: `replacementRegistry.js`, `replacementService.js`, 9 Type-Specific Synthetic Generators
- **OpenXML DOCX Redaction Engine** (`server/src/services/docxRedactionService.js` - `POST /api/documents/:documentId/redact`)
- **Post-Redaction PII Leakage Scanner Subsystem**: `leakageScanner.js`, `leakageAnalyzer.js`, `leakageReport.js` (`POST /api/documents/:documentId/verify-redaction`)
- **Gold-Standard Annotation & Formal Evaluation Engine Subsystem**:
  - `versionConfig.js` (Detector engine version freeze `1.0.0-final`)
  - `evaluationConfig.js` (Evaluation configuration settings)
  - `evaluationInputContract.js` (Pure JS input payload contract validator)
  - `annotationPolicy.js` (Annotation guidelines across all 9 PII categories)
  - `evaluationDatasetSchema.js` (JSON Schema contract validator for gold datasets)
  - `goldDatasetValidator.js` (Ground-truth offset invariant, SHA-256 hash, & overlap validator)
  - `evaluationEngine.js` (Span-level & character mask evaluation matching engine)
  - `metricsCalculator.js` (Entity & Character Precision, Recall, F1, Accuracy, Micro/Macro & 10x10 Confusion Matrix)
  - `evaluatorService.js` (High-level evaluation orchestrator service)
  - `maskingUtils.js` (Safe string masking for PII error examples)
  - `baselineReportGenerator.js` (`baseline-evaluation-result.json` & `baseline-evaluation-report.md`)
  - `finalComparisonGenerator.js` (`final-evaluation-result.json` & `final-vs-baseline-evaluation.md`)
  - `readme-facts.md` (100% empirically verified engineering facts compiler)
  - Dev API Endpoints: `POST /api/evaluation/run`, `POST /api/evaluation/baseline`, & `POST /api/evaluation/final`
  - `synthetic_gold_dataset.json` (Controlled multi-category synthetic evaluation test fixture)
  - `prospectus_gold_dataset.json` (Development gold dataset for Red Herring Prospectus.docx)
- **Assignment Documentation & Deliverables Subsystem**:
  - `README.md` (Comprehensive 28-section assignment README)
  - `evaluation-report.md` (Detailed 22-section formal evaluation report)
  - `assignment-compliance-checklist.md` (13-point assignment compliance audit checklist)
  - `submission-manifest.md` (Complete deliverables inventory & file manifest)
- **React Frontend UI & Document Workflow Subsystem** (`client/`):
  - `App.jsx` (State machine React shell: IDLE -> FILE_SELECTED -> UPLOADING -> UPLOADED -> DETECTING -> DETECTED -> REDACTING -> REDACTED -> VERIFYING -> VERIFIED -> EVALUATING -> COMPLETE -> READY_TO_DOWNLOAD)
  - `apiService.js` (Centralized REST API client consuming backend endpoints safely)
  - `Navbar.jsx` (Header banner & health check polling)
  - `DocumentUploadArea.jsx` (Drag & drop DOCX upload zone with client-side extension validation)
  - `WorkflowStatus.jsx` (5-stage visual timeline status indicator)
  - `DetectionSummaryCards.jsx` (Aggregate counts across all 9 PII categories — zero raw PII strings!)
  - `VerificationCard.jsx` (Post-redaction leakage status PASS/FAIL & leak counts)
  - `EvaluationPanel.jsx` (Precision, Recall, F1, Character Accuracy, PARTIAL DATASET notice, & per-type breakdown table)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated Test Suites**: `test_execution_012.js`, `test_execution_013.js`, `test_execution_014.js`, `test_execution_015.js`, `test_execution_016.js`, `test_execution_017.js`

### [PLANNED — NOT IMPLEMENTED]
- **MongoDB Data Persistence** (Redaction job metadata & history models planned for future execution)
- **Interactive PII Review & Evaluation Dashboard UI** (Document preview, entity toggle & evaluation dashboard UI planned for future execution)

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

## FLOW-011 — Gold Dataset and Evaluation Foundation

### Overview
Establishes the mathematical and data foundation for evaluating PII detection quality without altering production redaction behavior or calculating metrics against synthetic/unverified model outputs. Defines annotation policies across all 9 PII categories, schema contracts, ground-truth validator, span-level evaluation matching engine, metrics calculator, dataset loaders, synthetic fixtures, prospectus development gold dataset, and REST API evaluation endpoint (`POST /api/documents/:documentId/evaluate`).

---

## FLOW-012 — Formal PII Evaluation Engine

### Overview
Implements a reproducible, pure JavaScript Formal PII Evaluation Engine comparing ground-truth gold annotations against model predictions to produce entity-level and character-level metrics, per-type metrics, micro/macro averages, a $10 \times 10$ type confusion matrix, detailed error breakdown, and structured evaluation results (`POST /api/evaluation/run`).

---

## FLOW-013 — Baseline Evaluation Run and Error Analysis

### Overview
Executes the baseline evaluation run of the existing PII detection system against the validated gold-standard dataset using the formal evaluation engine, performs deep error analysis across all 9 PII categories, evaluates detector contributions, and generates baseline JSON and Markdown reports without modifying model prediction logic (`POST /api/evaluation/baseline`).

---

## FLOW-014 — Controlled PII Detector Improvement and Regression Hardening

### Overview
Implements evidence-based detector improvements targeting empirical baseline error categories observed in Execution 013, verifies before/after metric improvements, and enforces automated regression testing across the entire pipeline.

---

## FLOW-015 — Final Evaluation, Baseline Comparison, and Detector Freeze

### Overview
Freezes the improved detector implementation (`detectorVersion: "1.0.0-final"`), runs end-to-end evaluation, compares final results against Execution 013 baseline, verifies OpenXML redaction and post-redaction leakage rescan (0 Confirmed Leaks), checks source file SHA-256 immutability, compiles verified system facts (`readme-facts.md`), and executes automated test runner `test_execution_015.js` (`POST /api/evaluation/final`).

---

## FLOW-016 — Final Documentation and Evaluation Reporting

### Overview
Compiles complete, 100% empirically traceable assignment documentation, including the primary assignment `README.md`, detailed `evaluation-report.md`, `assignment-compliance-checklist.md`, `submission-manifest.md`, and automated documentation consistency test runner `test_execution_016.js`.

---

## FLOW-017 — React Frontend Workflow

### Overview
Provides an interactive React UI shell in `client/` driven by a state machine that consumes Express REST API endpoints without duplicating detection or redaction logic on the client.

---

### FLOW-017-A — Application Entry
- **Entry Point**: `http://localhost:5173` (`client/src/App.jsx`)
- **Input**: User loads application.
- **Processing**: Mounts Navbar, polls `GET /api/health`, and initializes state machine to `IDLE`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-B — File Selection
- **Entry Point**: `DocumentUploadArea.jsx`
- **Input**: User selects `.docx` file via file picker or drag & drop.
- **Processing**: Validates `.docx` file extension and 25 MB size limit for UX; updates state to `FILE_SELECTED`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-C — Upload
- **Entry Point**: `uploadDocument` in `apiService.js`
- **Input**: `POST /api/documents/upload`
- **Processing**: Sends `multipart/form-data`; stores file metadata and document ID; transitions state to `UPLOADING` -> `UPLOADED`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-D — Detection Processing
- **Entry Point**: `detectPii` in `apiService.js`
- **Input**: `POST /api/documents/:documentId/detect`
- **Processing**: Executes 9 PII detectors on backend; returns aggregate summary; transitions state to `DETECTING` -> `DETECTED`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-E — Detection Summary
- **Entry Point**: `DetectionSummaryCards.jsx`
- **Input**: Aggregate PII summary breakdown object.
- **Processing**: Renders category cards for all 9 PII types (Zero raw PII text!).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-F — Redaction Execution
- **Entry Point**: `redactDocument` in `apiService.js`
- **Input**: `POST /api/documents/:documentId/redact`
- **Processing**: Triggers in-place OpenXML synthetic redaction on backend; transitions state to `REDACTING` -> `REDACTED`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-G — Leakage Verification
- **Entry Point**: `verifyRedaction` in `apiService.js` & `VerificationCard.jsx`
- **Input**: `POST /api/documents/:documentId/verify-redaction`
- **Processing**: Runs post-redaction leakage scanner; displays PASS/FAIL status badge and safe summary counts; transitions state to `VERIFYING` -> `VERIFIED`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-H — Formal Evaluation Summary
- **Entry Point**: `evaluateDocument` in `apiService.js` & `EvaluationPanel.jsx`
- **Input**: `POST /api/evaluation/final`
- **Processing**: Displays Precision, Recall, F1, Character Accuracy, PARTIAL DATASET notice, and per-type table; transitions state to `EVALUATING` -> `COMPLETE`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-I — Download Action
- **Entry Point**: `GET /api/documents/:documentId/download`
- **Input**: User clicks "Download Redacted DOCX".
- **Processing**: Streams `<documentId>_redacted.docx` directly from server.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-J — Error Recovery
- **Entry Point**: Catch block in `App.jsx`
- **Input**: Network error or server HTTP exception.
- **Processing**: Displays safe UI error alert banner without exposing stack traces.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-017-K — Reset Workflow
- **Entry Point**: "Start New Document" button
- **Processing**: Clears state, resets document ID, and sets workflow state back to `IDLE`.
- **Status**: **[IMPLEMENTED]**

---

### Comprehensive Data Flow Diagram

```
User (Browser UI)
       │
       │ Selects DOCX
       ▼
DocumentUploadArea (UX Validation)
       │
       │ POST /api/documents/upload
       ▼
Express Ingestion (Document ID)
       │
       │ POST /api/documents/:id/detect
       ▼
DetectionSummaryCards (9 Categories)
       │
       │ POST /api/documents/:id/redact
       ▼
OpenXML DOCX Redaction
       │
       │ POST /api/documents/:id/verify-redaction
       ▼
VerificationCard (PASS / FAIL Badge)
       │
       │ POST /api/evaluation/final
       ▼
EvaluationPanel (Recall = 100.0%)
       │
       │ GET /api/documents/:id/download
       ▼
Redacted DOCX Download Stream
```
