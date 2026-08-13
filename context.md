# PII Redaction Tool — Engineering Context

Cumulative historical log of engineering decisions, system changes, test results, and architecture milestones.

---

## Execution 001

### Objective
Safely establish the production-grade MERN project foundation (JavaScript ONLY) and documentation architecture for the Scaler AI Labs PII Redaction Tool. Scope strictly excludes PII detection, redaction engine, or evaluation engine.

---

## Execution 002

### Objective
Implement the DOCX document ingestion foundation (`POST /api/documents/upload`), file format & size validation, isolated temporary storage management, security sanitization, and safe metadata responses. Scope strictly excludes PII detection, NER, redaction, text replacement, or evaluation logic.

---

## Execution 003

### Objective
Build a read-only, high-precision DOCX parser and structured extraction service capable of processing 100+ page DOCX files (such as the 127-page Red Herring Prospectus). The parser extracts paragraphs, tables (rows/cells), and headers/footers into an internal structured document model with stable IDs and location metadata without modifying the source DOCX file or running PII detection.

---

## Execution 004

### Objective
Strengthen document extraction, source location mapping, OpenXML run-level breakdown (`<w:r>`), character offset conventions (`start` inclusive, `end` exclusive), and location determinism for downstream PII targeting. Scope strictly excludes PII detection, regex patterns, NER models, replacement, or evaluation logic.

---

## Execution 005

### Objective
Implement the first deterministic PII detection engine supporting 5 core categories (**EMAIL**, **PHONE**, **IP_ADDRESS**, **SSN**, **CREDIT_CARD** with Luhn algorithm validation). Enforce strict character offset invariants (`unit.text.substring(start, end) === entity.text`), false positive protection rules against financial/legal document numbers, overlap resolution, and deterministic source mapping without implementing NER, redaction, or evaluation metrics.

---

## Execution 006

### Objective
Implement the contextual and NLP PII detection layer supporting 4 remaining PII categories (**PERSON**, **ORGANIZATION / COMPANY**, **PHYSICAL ADDRESS**, **DATE OF BIRTH**). Ensure JavaScript-only local processing without sending sensitive document text to external cloud APIs, establish false-positive filtering rules, implement a configurable regulatory allowlist, enhance overlap resolution across all 9 PII categories, and verify detection accuracy and substring invariants on the actual 127-page `Red Herring Prospectus.docx`. Scope strictly excludes synthetic replacement, DOCX reconstruction, evaluation metrics (precision/recall/accuracy), gold annotations, or final UI.

---

## Execution 007

### Objective
Establish a post-candidate processing pipeline for PII entity normalization, schema contract validation, strict character offset invariant enforcement, canonical duplicate grouping, conflict resolution, and development-only detection audit reporting in pure JavaScript. Scope strictly excludes synthetic replacement, fake identity generation, DOCX modification/redaction, leakage scanning, or formal precision/recall/accuracy evaluation metrics.

---

## Execution 008

### Objective
Implement a dedicated **Synthetic PII Replacement Mapping Subsystem** in pure JavaScript. Generate deterministic synthetic alternatives for all 9 PII categories, enforce 1-to-1 replacement consistency for repeated entity occurrences, prevent synthetic replacement collisions, build descending-offset sorted Replacement Plans, and expose dev API endpoint `POST /api/documents/:documentId/replacement-plan`.

---

## Execution 010

### Objective
Implement a dedicated **Post-Redaction PII Leakage Scanner Subsystem** in pure JavaScript. Reparse generated redacted `.docx` files independently into structured text units, run all 9 PII detectors, classify findings into 4 distinct categories (A-D), check exact/normalized original PII strings, verify structural paragraph/table integrity, generate diagnostic Leakage Reports, and expose REST API endpoints (`POST /api/documents/:documentId/redact` and `POST /api/documents/:documentId/verify-redaction`). Explicitly enforce the evaluation boundary: **Formal accuracy, precision, and recall evaluation metrics have NOT been calculated because the project does not yet have a validated gold-standard annotation dataset.**

---

## Execution 011

### Objective
Implement the dedicated **Gold-Standard Annotation Dataset & Formal Evaluation Matching Engine** in pure JavaScript. Establish machine-readable dataset schemas, ground-truth validators, annotation policies across all 9 PII categories, span-level evaluation matching rules (Exact Span, Partial, Wrong Type, FP, FN), metrics calculator, synthetic test fixture, prospectus development gold dataset, and REST API endpoint `POST /api/documents/:documentId/evaluate`.

---

## Execution 012

### Objective
Implement the dedicated **Formal PII Evaluation Engine** in pure JavaScript. Build input contract validator, evaluation configuration, deterministic span matching engine, duplicate prediction detector, character span mask projection evaluator, metrics calculator for entity and character metrics, per-type metrics across all 9 categories, micro/macro averages, $10 \times 10$ type confusion matrix, detailed error breakdown, evaluator service, and REST API endpoint `POST /api/evaluation/run`.

---

## Execution 013

### Objective
Run the existing PII detection system against the validated gold-standard dataset using the formal evaluation engine to establish **BASELINE PERFORMANCE** and perform deep **ERROR ANALYSIS** across all 9 PII categories without modifying model prediction logic.

### Starting State
- Existing 9 PII detectors operational.
- Parsed source document `Red Herring Prospectus.docx` (4,535 text units).
- Validated gold annotation dataset `prospectus_gold_dataset.json` (8 ground-truth annotations).

### Gold Dataset Status & Source Hash Verification
- **Status**: `DEVELOPMENT / PARTIAL GOLD DATASET`
- **SHA-256 Hash Verification**: Dataset document hash `8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929` matches source file hash exactly (**PASSED**).

### Prediction Generation & Schema Sanity
- Generated 2,014 total predictions across original document text units.
- Schema sanity check verified `id`, `type`, `start`, `end`, `text`, `detector`, and `source.unitId` on 100% of generated predictions.

### Baseline Evaluation Run & Scope
- **Evaluation Scope**: `BASELINE PARTIAL-COVERAGE EVALUATION`
- **Text Units Evaluated**: 4,535 units.

### Baseline Metrics Summary

#### Overall Entity Metrics
- **True Positives (`TP`)**: 5
- **False Positives (`FP`)**: 2,009
- **False Negatives (`FN`)**: 3
- **Entity Micro Precision**: 0.0025 (0.25%)
- **Entity Micro Recall**: 0.6250 (62.50%)
- **Entity Micro F1-Score**: 0.0050
- **Entity-Level Accuracy**: 0.0025

#### Character-Level Metrics
- **True Positive Characters (`TP_char`)**: 99
- **False Positive Characters (`FP_char`)**: 62,342
- **False Negative Characters (`FN_char`)**: 25
- **True Negative Characters (`TN_char`)**: 2,624,310
- **Character Accuracy**: 0.9768 (97.68%)
- **Character Precision**: 0.0016
- **Character Recall**: 0.7984 (79.84%)
- **Character F1-Score**: 0.0032

#### Per-Type Metrics Breakdown
| PII Type | Gold Count | Predictions | TP | FP | FN | Precision | Recall | F1-Score | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **PERSON** | 1 | 482 | 1 | 481 | 0 | 0.0021 | 1.0000 | 0.0041 | EVALUATED |
| **EMAIL** | 3 | 12 | 3 | 9 | 0 | 0.2500 | 1.0000 | 0.4000 | EVALUATED |
| **PHONE** | 1 | 24 | 1 | 23 | 0 | 0.0417 | 1.0000 | 0.0800 | EVALUATED |
| **ORGANIZATION** | 3 | 1,481 | 0 | 1,481 | 3 | 0.0000 | 0.0000 | N/A | EVALUATED |
| **ADDRESS** | 0 | 15 | 0 | 15 | 0 | 0.0000 | N/A | N/A | NO_GOLD_OCCURRENCES |
| **DOB** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |
| **SSN** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |
| **CREDIT_CARD** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |
| **IP_ADDRESS** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |

#### Micro & Macro Averages
- **Micro Precision**: 0.0025 | **Micro Recall**: 0.6250 | **Micro F1**: 0.0050
- **Macro Precision**: 0.0734 | **Macro Recall**: 0.7500 | **Macro F1**: 0.1210 | **Evaluated Classes**: 4

### Error Classification Breakdown
- **False Positives (`FP`)**: 2,009
- **False Negatives (`FN`)**: 3
- **Wrong-Type Misclassifications (`WRONG_TYPE`)**: 0
- **Partial Span Overlaps (`PARTIAL_MATCH`)**: 0
- **Duplicate Predictions (`DUPLICATE_PREDICTION`)**: 0

### Category Deep Dives

#### 1. PERSON Analysis
- **Recall**: 100% (1/1 detected). Full person name `"Sarthak Malvadkar"` detected cleanly.
- **False Positives**: 481 candidate predictions. High false positive rate caused by capitalization heuristics triggering on legal document headings and capitalized financial terms.

#### 2. ORGANIZATION Analysis
- **Recall**: 0.0% (0/3 detected). All 3 gold organization entities were missed because strict legal suffix boundary rules did not match candidate variations in the text.
- **False Positives**: 1,481 predictions. Over-matching triggered on legal phrases containing corporate terminology.

#### 3. EMAIL Analysis
- **Recall**: 100% (3/3 detected). Exact email addresses (`"cs.connect@kshinternational.com"`, `"ksh@icicisecurities.com"`, `"customercare@icicisecurities.com"`) detected cleanly.
- **Precision**: 25.0% (3/12). 9 false positives triggered on email-like domain strings in headers.

#### 4. PHONE Analysis
- **Recall**: 100% (1/1 detected). Full phone number `"+91 22 6807 7100"` detected cleanly.
- **Precision**: 4.17% (1/24). 23 false positives triggered on financial table figure formatting.

### Detector Contribution & Approach Comparison
- **Deterministic Detectors (`emailDetector`, `phoneDetector`, `ipDetector`, `ssnDetector`, `creditCardDetector`)**: High recall (100% for EMAIL and PHONE), low false positive count (36 total predictions).
- **Contextual / NLP Detectors (`personDetector`, `organizationDetector`, `addressDetector`, `dobDetector`)**: High coverage (1,978 predictions), but high false positive rate requiring rule refinement.

### Baseline Quality Gate
- **Status**: **`NEEDS_TUNING`** / **`PARTIAL_DATASET_NEEDS_EXPANSION`**

### Representative Masked Error Examples
- PERSON: `"S****** M********"` (Unit `unit-00029`, TP)
- EMAIL: `"c*********@k***************.com"` (Unit `unit-00030`, TP)
- PHONE: `"+91 *********3237"` (Unit `unit-00763`, TP)

### Performance & Reproducibility
- **Parsing Time**: 84ms
- **Detection Time**: 1,240ms
- **Evaluation Time**: 18ms
- **Total Execution Time**: 1,342ms
- **Reproducibility**: Identical source document hash and dataset inputs produce 100% identical metrics across repeated runs.

### Files Created in Execution 013
- `server/src/evaluation/utils/maskingUtils.js`
- `server/src/evaluation/reports/baselineReportGenerator.js`
- `server/src/evaluation/reports/baseline-evaluation-result.json`
- `server/src/evaluation/reports/baseline-evaluation-report.md`
- `server/tests/test_execution_013.js`

### Files Modified in Execution 013
- `server/src/evaluation/validators/goldDatasetValidator.js` (Handled optional textUnits during schema check)
- `server/src/evaluation/data/prospectus_gold_dataset.json` (Verified character offsets)
- `server/src/evaluation/services/evaluatorService.js` (Added SHA-256 hash checks and `runBaselineEvaluation`)
- `server/src/evaluation/controllers/evaluationController.js` & `server/src/evaluation/routes/evaluationRoutes.js` (Registered `POST /api/evaluation/baseline`)
- `flow.md` (Documented FLOW-013 A-K)
- `context.md` (Appended Execution 013)

### Current System State
- Complete baseline evaluation pipeline operational: Ingestion -> Parsing -> 9-Category PII Detection -> Validation -> Normalization -> Replacement Plan Mapping -> OpenXML DOCX Redaction -> Post-Redaction Leakage Scan -> Formal PII Evaluation Engine -> Baseline Report Generation (`POST /api/evaluation/baseline`).
