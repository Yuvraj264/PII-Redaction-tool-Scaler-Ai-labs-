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
  - `evaluationConfig.js` (Evaluation configuration settings)
  - `evaluationInputContract.js` (Pure JS input payload contract validator)
  - `annotationPolicy.js` (Annotation guidelines across all 9 PII categories)
  - `evaluationDatasetSchema.js` (JSON Schema contract validator for gold datasets)
  - `goldDatasetValidator.js` (Ground-truth offset invariant, SHA-256 hash, & overlap validator)
  - `evaluationEngine.js` (Span-level & character mask evaluation matching engine)
  - `metricsCalculator.js` (Entity & Character Precision, Recall, F1, Accuracy, Micro/Macro & 10x10 Confusion Matrix)
  - `evaluatorService.js` (High-level evaluation orchestrator service)
  - `evaluationController.js` & `evaluationRoutes.js` (`POST /api/evaluation/run`)
  - `synthetic_gold_dataset.json` (Controlled multi-category synthetic evaluation test fixture)
  - `prospectus_gold_dataset.json` (Development gold dataset for Red Herring Prospectus.docx)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated Evaluator Test Suite** (`server/tests/test_execution_012.js`)

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

### FLOW-012-A — Evaluation Input Validation
- **Entry Point**: `evaluationInputContract.validateInput(payload)`
- **Input**: Payload `{ goldAnnotations, predictions, evaluationConfig }`.
- **Processing**: Validates array format, required fields, offset bounds, and supported entity types independently of database or HTTP context.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-B — Gold / Prediction Span Matching
- **Entry Point**: `evaluationEngine.evaluate(predictions, goldAnnotations, textUnits)`
- **Input**: Deterministically sorted predictions and gold annotations.
- **Processing**: Searches matching `unitId` for exact span match (`pred.start === gold.start && pred.end === gold.end`). Tracks duplicate predictions separately.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-C — TP / FP / FN Classification
- **Entry Point**: `evaluationEngine.evaluate()` classification step.
- **Input**: Matched span pairs.
- **Processing**:
  - `TP`: Exact span and entity type match.
  - `FP`: Unmatched prediction or duplicate prediction.
  - `FN`: Unmatched gold annotation.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-D — Partial Match Handling
- **Entry Point**: `evaluationEngine.evaluate()` partial overlap check.
- **Input**: Prediction overlapping gold span (`pred.start < gold.end && gold.start < pred.end`).
- **Processing**: Tracks partial match separately in report metrics (`errorBreakdown.partialMatches`). Contributes FP for prediction and FN for gold under strict entity evaluation.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-E — Wrong-Type Handling
- **Entry Point**: `evaluationEngine.evaluate()` type match check.
- **Input**: Exact span match with differing entity type (`pred.type !== gold.type`).
- **Processing**: Classifies as `WRONG_TYPE`. Records exact pair in `errorBreakdown.wrongType.pairs`. Contributes FP to `pred.type` and FN to `gold.type`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-F — Entity-Level Metrics
- **Entry Point**: `metricsCalculator.calculateMetrics()`
- **Input**: Aggregated entity counts.
- **Processing**: Computes Entity Precision ($\text{TP}/(\text{TP}+\text{FP})$), Entity Recall ($\text{TP}/(\text{TP}+\text{FN})$), Entity F1 ($2\text{PR}/(\text{P}+\text{R})$), and Entity-Level Accuracy ($\text{TP}/(\text{TP}+\text{FP}+\text{FN})$).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-G — Character-Level Metrics
- **Entry Point**: `evaluationEngine.calculateTokenMetrics(predictions, goldAnnotations, textUnits)`
- **Input**: Text units and character offset spans.
- **Processing**: Generates binary character masks ($\text{PII} = 1$, $\text{NON\_PII} = 0$) across text units to yield $\text{TP}_{\text{char}}$, $\text{FP}_{\text{char}}$, $\text{FN}_{\text{char}}$, $\text{TN}_{\text{char}}$, and $\text{Character Accuracy} = (\text{TP}_{\text{char}} + \text{TN}_{\text{char}}) / \text{Total}_{\text{char}}$.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-H — Per-Type Metrics
- **Entry Point**: `metricsCalculator.calculateMetrics()` per-type loop.
- **Input**: Per-type TP, FP, FN, Partial, WrongType counts across all 9 PII categories.
- **Processing**: Computes independent Precision, Recall, F1 for each category. Zero-gold categories report `N/A`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-I — Micro Metrics
- **Entry Point**: `metricsCalculator.calculateMetrics()` micro aggregation.
- **Input**: Global TP, FP, FN totals.
- **Processing**: Computes Micro Precision, Micro Recall, and Micro F1.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-J — Macro Metrics
- **Entry Point**: `metricsCalculator.calculateMetrics()` macro calculation.
- **Input**: Array of evaluated class metrics.
- **Processing**: Computes unweighted average of Precision, Recall, and F1 across applicable categories (excluding `N/A` classes from denominator).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-K — $10 \times 10$ Type Confusion Matrix
- **Entry Point**: `evaluationEngine.evaluate()` confusion matrix tracking.
- **Input**: Matches, Wrong-Type predictions, FPs, and FNs.
- **Processing**: Fills $10 \times 10$ matrix (`matrix[predType][goldType]`) across 9 PII categories plus `'NONE'`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-L — Evaluation Result Generation
- **Entry Point**: `POST /api/evaluation/run`
- **Input**: Document ID or raw inputs.
- **Processing**: Executes evaluation pipeline and returns structured evaluation report payload.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-012-M — Evaluation Reproducibility
- **Entry Point**: Evaluator Service execution.
- **Input**: Source document hash, dataset version, evaluation configuration.
- **Processing**: Guarantees identical metric outputs when executing same inputs.
- **Status**: **[IMPLEMENTED]**

---

### Comprehensive Data Flow Diagram

```
Gold Dataset (goldAnnotations)             Model Predictions (predictions)
        │                                          │
        └───────────────────┬──────────────────────┘
                            ▼
           Input Contract Validation (evaluationInputContract.js)
                            │
                            ▼
           Deterministic Span Matching Engine (evaluationEngine.js)
            ├── Duplicate Prediction Detection (duplicateCount)
            ├── Exact Span & Type Match (TP)
            ├── Wrong Type Match (WRONG_TYPE)
            ├── Partial Span Overlap (PARTIAL_MATCH)
            └── Character Binary Mask Projection (TP_char, TN_char, FP_char, FN_char)
                            │
                            ▼
           Metrics Calculator Service (metricsCalculator.js)
            ├── Entity-Level & Character-Level Accuracy
            ├── Micro & Macro Precision / Recall / F1
            ├── Per-Type Metrics across 9 Categories
            ├── Detailed Error Breakdown (FPs, FNs, WrongTypes, Partials, Duplicates)
            └── 10x10 Type Confusion Matrix (including NONE)
                            │
                            ▼
           HTTP 200 OK Response (POST /api/evaluation/run)
```
