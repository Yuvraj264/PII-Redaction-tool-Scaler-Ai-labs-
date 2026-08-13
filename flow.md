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
  - `FINAL-SUBMISSION-MANIFEST.md` (Final submission manifest)
  - `qa-plan.md`, `qa-results.md`, `bug-register.md` (Quality assurance strategy, result matrix & bug tracking register)
- **React Frontend UI & Document Workflow Subsystem** (`client/`):
  - `App.jsx` (State machine React shell: IDLE -> FILE_SELECTED -> UPLOADING -> UPLOADED -> DETECTING -> DETECTED -> REDACTING -> REDACTED -> VERIFYING -> VERIFIED -> EVALUATING -> COMPLETE -> READY_TO_DOWNLOAD)
  - `apiService.js` (Centralized REST API client consuming backend endpoints safely)
  - `Navbar.jsx` (Header banner & health check polling)
  - `DocumentUploadArea.jsx` (Drag & drop DOCX upload zone with client-side extension validation)
  - `WorkflowStatus.jsx` (5-stage visual timeline status indicator)
  - `DetectionSummaryCards.jsx` (Aggregate counts across all 9 PII categories — zero raw PII strings!)
  - `VerificationCard.jsx` (Post-redaction leakage status PASS/FAIL & leak counts)
  - `EvaluationPanel.jsx` (Precision, Recall, F1, Character Accuracy, PARTIAL DATASET notice, & per-type breakdown table)
- **Submission Packaging & Archive Subsystem**:
  - `submission/` (Clean submission directory containing source, deliverables, evaluation JSON, and redacted output DOCX)
  - `PII-Redaction-Tool-Submission.zip` (Clean submission zip archive)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated Test Suites**: `test_execution_010.js` through `test_execution_019.js`

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
Parses an ingested DOCX document into a structured internal model containing paragraphs, table cells, headers, and footers with stable unit IDs (`unit-00001`) and location metadata without modifying the source DOCX file or running PII detection.

---

## FLOW-004 — Extraction Verification and Source Mapping

### Overview
Validates structural text extraction, OpenXML run-level breakdown (`<w:r>`), character offset conventions (`start` inclusive, `end` exclusive), and location determinism for downstream PII targeting.

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

## FLOW-018 — Complete End-to-End QA, Security & Verification

### Overview
Executes a 35-item QA test suite, verifies source file immutability, checks path traversal security protection, verifies clean restart behavior, creates `qa-plan.md`, `qa-results.md` (`QA_PASS`), `bug-register.md`, and automated test runner `test_execution_018.js`.

---

## FLOW-019 — Submission Packaging & Deliverable Assembly

### Overview
Assembles the final, clean submission package in `submission/` and `PII-Redaction-Tool-Submission.zip` following strict QA gate validation.

---

### FLOW-019-A — QA Gate Check
- **Entry Point**: `qa-results.md` & `bug-register.md`
- **Input**: Verified QA matrix (35/35 PASSED) and bug register (0 open bugs).
- **Processing**: Confirms **`QA_PASS`** status before allowing packaging to proceed.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-B — Clean Submission Directory Assembly
- **Entry Point**: `submission/`
- **Input**: Source files, documentation, deliverables, and evaluation JSON.
- **Processing**: Copies required `client/`, `server/`, `output/`, and `evaluation/` files while strictly excluding `node_modules/`, `.git`, `.env` secrets, and the original unredacted DOCX.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-C — Source Collection
- **Entry Point**: `submission/client/` & `submission/server/`
- **Input**: Application source files, `package.json`, `package-lock.json`.
- **Processing**: Copies pure JavaScript (`.js`, `.jsx`) source code without `node_modules`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-D — Redacted DOCX Output Verification
- **Entry Point**: `submission/output/final-redacted-document.docx`
- **Input**: Generated redacted DOCX file.
- **Processing**: Verifies file exists, reparses cleanly, and confirms **0 Confirmed Leaks (PASS)**.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-E — Documentation Collection
- **Entry Point**: `submission/`
- **Input**: `README.md`, `evaluation-report.md`, `assignment-compliance-checklist.md`, `submission-manifest.md`, `FINAL-SUBMISSION-MANIFEST.md`, `qa-plan.md`, `qa-results.md`, `bug-register.md`.
- **Processing**: Collects all 8 assignment and QA documentation files into `submission/`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-F — Secret Scan
- **Entry Point**: `test_execution_019.js`
- **Processing**: Recursively scans `submission/` for `.env` files or API key patterns; confirms only `.env.example` placeholder exists.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-G — PII Exclusion Audit
- **Entry Point**: `test_execution_019.js`
- **Processing**: Scans `submission/` for raw unmasked PII strings or original prospectus document copies.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-H — Clean Install & Extraction Simulation
- **Entry Point**: `PII-Redaction-Tool-Submission.zip`
- **Processing**: Generates submission zip archive, extracts into `scratch/test_extraction`, verifies folder hierarchy and file completeness, and cleans up temporary extraction folder.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-019-I — Final Packaging Verification
- **Entry Point**: `node server/tests/test_execution_019.js`
- **Processing**: Runs automated 11-suite packaging test runner verifying gate status, deliverables inventory, secret exclusion, metric consistency, zip extraction, and complete regression suite.
- **Status**: **[IMPLEMENTED]**

---

### Packaging Workflow Diagram

```
QA Gate (QA_PASS Confirmed)
       │
       ▼
Assemble Clean submission/ Directory
       ├── client/ (React UI - NO node_modules)
       ├── server/ (Express API - NO node_modules, NO unredacted DOCX)
       ├── output/ (final-redacted-document.docx - 0 Leaks)
       ├── evaluation/ (final-evaluation-result.json)
       ├── README.md & evaluation-report.md
       ├── assignment-compliance-checklist.md & FINAL-SUBMISSION-MANIFEST.md
       └── .env.example & package.json
       │
       ▼
Security & Exclusion Audits (0 Secrets, 0 Raw PII, 0 TypeScript)
       │
       ▼
Create PII-Redaction-Tool-Submission.zip
       │
       ▼
Extract & Run Automated Test Runner (test_execution_019.js - 11/11 PASSED)
       │
       ▼
FINAL SUBMISSION READY
```

# FLOW-020A — Precision Audit & Result Consistency Fix

Documenting the systematic root-cause tracing, detector precision hardening, UI/API response structure harmonization, synthetic 9-category capability verification, and metric reporting consistency.

### FLOW-020A-A — UI / API Response Data Flow Fix
- **Entry Point**: `client/src/services/apiService.js` -> `detectPii()`
- **Input**: Backend response from `POST /api/documents/:documentId/detect`
- **Processing**: Restructured payload parsing in `apiService.js` and `documentController.js` so `summary.breakdown` object properties (`PERSON`, `EMAIL`, `PHONE`, `ORGANIZATION`, `ADDRESS`, `DOB`, `SSN`, `CREDIT_CARD`, `IP_ADDRESS`) map directly to `DetectionSummaryCards.jsx` state.
- **Output**: `DetectionSummaryCards.jsx` renders actual category counts (e.g. PERSON: 176, EMAIL: 49, PHONE: 11, ORGANIZATION: 613) instead of 0.
- **Status**: **PASS**

### FLOW-020A-B — Synthetic 9-Category Capability Test
- **Entry Point**: `server/src/evaluation/data/synthetic_9_type_test_fixture.js`
- **Input**: Controlled synthetic text units containing fake test entities for all 9 required PII categories.
- **Processing**: Executes detection, synthetic replacement, OpenXML redaction, and post-redaction leakage scanning.
- **Output**: 100% detection capability across all 9 required PII categories (**PERSON**, **EMAIL**, **PHONE**, **ORGANIZATION**, **ADDRESS**, **DOB**, **SSN**, **CREDIT_CARD**, **IP_ADDRESS**).
- **Status**: **PASS**

### FLOW-020A-C — Precision Hardening & Benchmark Verification
- **Entry Point**: `server/src/detectors/personDetector.js` & `server/src/detectors/organizationDetector.js`
- **Input**: 4,535 structured document text units from `Red Herring Prospectus.docx`.
- **Processing**: Applied strict candidate filtering for single all-caps table tokens, section headings, and non-person legal terms while preserving person honorific/role context signals.
- **Output**: False positives reduced from 1,600 to 862 (46.1% total FP reduction) while guaranteeing **100.0% Micro Recall (8/8 True Positives, 0 False Negatives)**.
- **Status**: **`PRECISION_AUDIT_PASS_WITH_LIMITATIONS`**
