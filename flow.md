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
  - `annotationPolicy.js` (Annotation guidelines across all 9 PII categories)
  - `evaluationDatasetSchema.js` (JSON Schema contract validator for gold datasets)
  - `goldDatasetValidator.js` (Ground-truth offset invariant, SHA-256 hash, & overlap validator)
  - `evaluationEngine.js` (Span-level evaluation matching engine & TP/FP/FN/Partial/WrongType classifier)
  - `metricsCalculator.js` (Precision, Recall, F1, Accuracy, Micro/Macro averages & Confusion Matrix)
  - `evaluationDatasetLoader.js` (Dataset loader & file hash verifier)
  - `synthetic_gold_dataset.json` (Controlled multi-category synthetic evaluation test fixture)
  - `prospectus_gold_dataset.json` (Development gold dataset for Red Herring Prospectus.docx)
  - Dev API Endpoint: `POST /api/documents/:documentId/evaluate`
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated Evaluator Test Suite** (`server/tests/test_execution_011.js`)

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

### FLOW-011-A — Annotation Policy
- **Entry Point**: `server/src/evaluation/policy/annotationPolicy.js`
- **Input**: PII entity candidates across all 9 categories.
- **Processing**: Enforces category-specific annotation guidelines (e.g. full person names excluding titles/roles, complete email/phone strings, complete company names excluding regulatory bodies, smallest complete physical address spans excluding labels, actual DOB date values).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-B — Candidate Suggestion
- **Entry Point**: `piiDetectionService.detectPiiInDocument(documentId)`
- **Input**: Document ID.
- **Processing**: Generates initial candidate predictions for human annotation review. Candidate predictions are explicitly marked as suggestions and do NOT automatically become gold labels.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-C — Human Verification
- **Entry Point**: Annotation Review & Dataset Authoring.
- **Input**: Candidate predictions and source document text units.
- **Processing**: Human reviewer accepts, rejects, modifies span boundaries, or adds missing entity annotations to form ground truth.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-D — Gold Dataset Validation
- **Entry Point**: `goldDatasetValidator.validateDataset(dataset, textUnits, sourceFilePath)`
- **Input**: Gold dataset JSON object, structured text units, and optional source file path.
- **Processing**: Validates dataset schema, ID uniqueness, offset bounds (`start >= 0`, `end > start`, `end <= unitText.length`), substring text invariant (`unitText.substring(start, end) === annotation.text`), gold overlap rules, and SHA-256 document hash integrity.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-E — Prediction / Gold Span Matching
- **Entry Point**: `evaluationEngine.evaluate(predictions, goldAnnotations, textUnits)`
- **Input**: Predictions array and validated gold annotations array.
- **Processing**: Searches gold annotations in matching `unitId` for exact span match (`pred.start === gold.start && pred.end === gold.end`).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-F — TP / FP / FN Classification
- **Entry Point**: `evaluationEngine.evaluate()` classification step.
- **Input**: Exact span matches and unmatched entities.
- **Processing**:
  - `TP`: Exact span and entity type match.
  - `FP`: Prediction with no matching gold entity.
  - `FN`: Gold entity with no matching prediction.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-G — Partial Match Handling
- **Entry Point**: `evaluationEngine.evaluate()` partial overlap check.
- **Input**: Prediction overlapping gold span (`pred.start < gold.end && gold.start < pred.end`).
- **Processing**: Tracks partial match separately in report metrics (`summary.partialMatches`). Does NOT count partial match as True Positive.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-H — Wrong-Type Handling
- **Entry Point**: `evaluationEngine.evaluate()` type comparison step.
- **Input**: Exact span match with differing entity type (`pred.type !== gold.type`).
- **Processing**: Classifies as `WRONG_TYPE`. Counts as FP for predicted type and FN for gold type in metric calculations.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-I — Metric Calculation Foundation
- **Entry Point**: `metricsCalculator.calculateMetrics()`
- **Input**: Aggregated evaluation counts.
- **Processing**: Computes Precision ($\text{TP}/(\text{TP}+\text{FP})$), Recall ($\text{TP}/(\text{TP}+\text{FN})$), F1 ($2\text{PR}/(\text{P}+\text{R})$), Entity-Level Accuracy ($\text{TP}/(\text{TP}+\text{FP}+\text{FN})$), Token Accuracy, Per-Type Metrics, Micro/Macro averages (handling zero-division cleanly), and Type Confusion Matrix.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-011-J — Evaluation Reproducibility
- **Entry Point**: `POST /api/documents/:documentId/evaluate`
- **Input**: Document ID.
- **Processing**: Loads document text units, verifies document SHA-256 hash, runs evaluation engine against dataset, and returns reproducible JSON payload containing dataset metadata, policy version, and full metrics.
- **Status**: **[IMPLEMENTED]**

---

### Comprehensive Data Flow Diagram

```
Source DOCX Archive
     │
     ▼
Structured Document Parsing (docxParserService.js)
     │
     ├─────────────────────────────────────────┐
     ▼                                         ▼
Model Predictions                        Human Review & Gold Annotation
 (piiDetectionService.js)                (annotationPolicy.js)
     │                                         │
     │                                         ▼
     │                                   Gold Dataset Schema & Hash Validation
     │                                   (goldDatasetValidator.js)
     │                                         │
     └───────────────────┬─────────────────────┘
                         ▼
             Span-Level Evaluation Matching Engine (evaluationEngine.js)
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
         Exact TP    Partial     Wrong Type / FP / FN
             │
             ▼
   Metrics Calculator Service (metricsCalculator.js)
     ├── Micro & Macro Precision / Recall / F1
     ├── Entity-Level & Token-Level Accuracy
     ├── Per-Type Metrics across 9 Categories
     └── Type-Level Confusion Matrix
             │
             ▼
   HTTP 200 OK Response (POST /api/documents/:documentId/evaluate)
```
