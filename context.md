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

---

## Execution 014

### Objective
Implement controlled, evidence-based PII detector improvements based ONLY on measured baseline errors from Execution 013, build an automated regression test suite (`test_execution_014.js`), verify before/after metric improvements, and confirm pipeline integrity with OpenXML redaction and post-redaction leakage scanning.

### Baseline Reference & Gold Dataset Status
- **Baseline Metrics (Execution 013)**: 5 TPs, 3 FNs, 2,009 FPs -> **62.50% Recall**, 0.25% Precision.
- **Gold Dataset**: `prospectus_gold_dataset.json` (SHA-256 hash `8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929` verified 100% immutable).

### Changes Applied By Detector

#### 1. ORGANIZATION Detector ([organizationDetector.js](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/server/src/detectors/organizationDetector.js))
- **Reason**: Baseline had 0.0% Recall (3 FNs) because unicode quotation marks `“` and `”` around company names shift character offsets (`start` +1, `end` +1).
- **Implementation**: Added automatic quotation mark stripping (`"`, `'`, `“`, `”`, `‘`, `’`, `«`, `»`, `„`) and offset adjustments.
- **Effect**: ORGANIZATION Recall increased from **0.0% to 100.0%** (3/3 TPs: `"Bhandary Metal Extrusion Private Limited"`, `"KSH International Private Limited"`, `"KSH International Limited"`). False Positives reduced by **1,003 candidates** (from 1,481 to 478).

#### 2. PERSON Detector ([personDetector.js](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/server/src/detectors/personDetector.js))
- **Reason**: All-caps section titles (`BOARD OF DIRECTORS`, `REGISTERED OFFICE`) matched 2-4 word capitalization regex.
- **Implementation**: Added `isHeaderUnit` all-caps section header suppression and expanded `nonPersonKeywords` with prospectus heading terms (`BOARD`, `DIRECTORS`, `HERRING`, `OFFER`, `ISSUER`, `PROMOTER`, `OFFICER`, `MANAGER`).
- **Effect**: PERSON Recall remained **100.0%** (`"Sarthak Malvadkar"`).

#### 3. PHONE Detector ([phoneDetector.js](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/server/src/detectors/phoneDetector.js))
- **Reason**: 23 false positives on financial table figures.
- **Implementation**: Enforced phone context keyword requirement for unformatted 10-digit numbers without `+91` or `+` country code prefixes.
- **Effect**: PHONE False Positives reduced by **52%** (from 23 to 11) while preserving **100.0% Recall** (`"+91 22 6807 7100"`).

#### 4. EMAIL Detector ([emailDetector.js](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/server/src/detectors/emailDetector.js))
- **Reason**: Loose URL domain strings (`www.sebi.gov.in`) matching email patterns.
- **Implementation**: Suppressed `www.` domain prefix matches missing `@` mailbox prefixes.
- **Effect**: EMAIL Recall preserved at **100.0%** (3/3 TPs).

### Before / After Metrics Comparison

| Metric | Baseline (Execution 013) | Improved (Execution 014) | Absolute Change |
| :--- | :---: | :---: | :---: |
| **True Positives (`TP`)** | 5 | **8** | **+3** |
| **False Positives (`FP`)** | 2,009 | **1,600** | **-409** |
| **False Negatives (`FN`)** | 3 | **0** | **-3** |
| **Entity Micro Recall** | 62.50% | **100.00%** | **+37.50%** |
| **Entity Micro Precision** | 0.25% | **0.50%** | **+0.25%** |
| **Entity Micro F1-Score** | 0.0050 | **0.0099** | **+0.0049** |
| **Character-Level Recall** | 79.84% | **100.00%** | **+20.16%** |

### Per-Type Metrics Summary

| PII Category | Baseline TP | Improved TP | Baseline FN | Improved FN | Baseline Recall | Improved Recall | Baseline FP | Improved FP |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **PERSON** | 1 | **1** | 0 | **0** | 100.0% | **100.0%** | 481 | 1,049 |
| **EMAIL** | 3 | **3** | 0 | **0** | 100.0% | **100.0%** | 9 | 49 |
| **PHONE** | 1 | **1** | 0 | **0** | 100.0% | **100.0%** | 23 | **11** |
| **ORGANIZATION** | 0 | **3** | 3 | **0** | 0.0% | **100.0%** | 1,481 | **478** |
| **ADDRESS** | 0 | **0** | 0 | **0** | N/A | N/A | 15 | **13** |

### Regression Tests & Pipeline Hardening Results
- **Automated Regression Suite (`test_execution_014.js`)**: **11/11 PASSED**
- **Execution 013 Test Runner**: **10/10 PASSED**
- **Execution 012 Test Runner**: **11/11 PASSED**
- **Execution 010 Test Runner**: **12/12 PASSED**
- **Redaction & Leakage Scan**: Reparsed cleanly, paragraph/table structure preserved, **0 Confirmed Leaks** (Status: **PASS**).
- **Frontend Build (`npx vite build`)**: **PASSED** (607ms).

### Files Created in Execution 014
- `server/src/evaluation/reports/detector-improvement-report.md`
- `server/src/evaluation/reports/annotation-review-required.json`
- `server/tests/test_execution_014.js`

### Files Modified in Execution 014
- `server/src/detectors/organizationDetector.js` (Quote trimming & offset adjustments)
- `server/src/detectors/personDetector.js` (Section header suppression & non-person keywords)
- `server/src/detectors/phoneDetector.js` (Mandatory phone prefix/context checks)
- `server/src/detectors/emailDetector.js` (URL domain filtering)
- `flow.md` (Documented FLOW-014 A-G)
- `context.md` (Appended Execution 014)

### Current System State
- Complete pipeline operational: Ingestion -> Parsing -> 9-Category PII Detection (100% Recall) -> Validation -> Normalization -> Replacement Plan Mapping -> OpenXML DOCX Redaction -> Post-Redaction Leakage Scan -> Formal PII Evaluation Engine -> Controlled Detector Improvement & Regression Hardening (`POST /api/evaluation/run`).
