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

### Input Contract Validation
`evaluationInputContract.js` validates payload `{ goldAnnotations, predictions, evaluationConfig }` independently of database, HTTP, or UI.

### Matching Rules & Error Classification
- **Exact Span Match (`TP`)**: Span, type, and source unit match gold annotation exactly.
- **Wrong Type (`WRONG_TYPE`)**: Span matches, but entity type differs (counted as FP for predicted type, FN for gold type). Recorded in `errorBreakdown.wrongType.pairs`.
- **Partial Overlap (`PARTIAL_MATCH`)**: Overlapping span (`gold.start < pred.end && pred.start < gold.end`) but not exact match (tracked separately in `errorBreakdown.partialMatches`, contributes FP to predicted type and FN to gold type under strict entity evaluation).
- **Duplicate Prediction (`DUPLICATE_PREDICTION`)**: Multiple identical predictions emitted by detector. Increments `duplicatePredictionCount` and contributes FP under strict entity evaluation.
- **False Positive (`FP`)**: Unmatched prediction.
- **False Negative (`FN`)**: Unmatched gold annotation.

### Metric Formulations
- **Entity Precision**: $\text{TP} / (\text{TP} + \text{FP})$
- **Entity Recall**: $\text{TP} / (\text{TP} + \text{FN})$
- **Entity F1-Score**: $2 \times \text{Precision} \times \text{Recall} / (\text{Precision} + \text{Recall})$
- **Entity-Level Accuracy**: $\text{TP} / (\text{TP} + \text{FP} + \text{FN})$
- **Character-Level Accuracy**: $(\text{TP}_{\text{char}} + \text{TN}_{\text{char}}) / (\text{TP}_{\text{char}} + \text{TN}_{\text{char}} + \text{FP}_{\text{char}} + \text{FN}_{\text{char}})$
- **Micro Metrics**: Aggregate TP, FP, FN across all entity types.
- **Macro Metrics**: Average per-type metrics over applicable classes with gold annotations/predictions present (excluding `N/A` classes from denominator).
- **$10 \times 10$ Type Confusion Matrix**: Matrix tracking predictions vs gold annotations across all 9 PII types plus `'NONE'`.

### Automated Evaluation Test Runner Results
Executed `node server/tests/test_execution_012.js`:
- **Total Test Suites**: 11 Test Suites
- **Status**: **11 PASSED, 0 FAILED**
- **Test Breakdown**:
  1. Synthetic Exact Match (P=1, R=1, F1=1, Char Accuracy=1): PASSED
  2. Synthetic FP Test (TP=1, FP=1, FN=0 -> P=0.5, R=1.0, F1=0.6667): PASSED
  3. Synthetic FN Test (TP=1, FP=0, FN=1 -> P=1.0, R=0.5, F1=0.6667): PASSED
  4. Synthetic Wrong Type Test (Gold PERSON, Pred ORG -> FP for ORG, FN for PERSON): PASSED
  5. Synthetic Partial Span Overlap Test (Gold "John Doe", Pred "John" -> Partial=1, FP=1, FN=1): PASSED
  6. Synthetic Duplicate Predictions Test (Duplicate pred -> duplicateCount=1, FP=1): PASSED
  7. Synthetic No-Gold Test (Gold empty, Pred PERSON -> FP=1, P=0, R="N/A"): PASSED
  8. Synthetic No-Prediction Test (Gold PERSON, Pred empty -> FN=1, P="N/A", R=0): PASSED
  9. Character Accuracy Projection Test (Exact vs Extra PII characters): PASSED
  10. Per-Type Independent Metrics Test across all 9 PII categories: PASSED
  11. HTTP API Endpoint Test (`POST /api/evaluation/run`): PASSED
- **Frontend Compilation (`npx vite build`)**: **PASSED** (634ms).

### Files Created in Execution 012
- `server/src/evaluation/config/evaluationConfig.js`
- `server/src/evaluation/contracts/evaluationInputContract.js`
- `server/src/evaluation/services/evaluatorService.js`
- `server/src/evaluation/controllers/evaluationController.js`
- `server/src/evaluation/routes/evaluationRoutes.js`
- `server/tests/test_execution_012.js`

### Files Modified in Execution 012
- `server/src/evaluation/engine/evaluationEngine.js` (Added contract validation, duplicate prediction tracking, character mask projections, $10 \times 10$ confusion matrix)
- `server/src/evaluation/engine/metricsCalculator.js` (Added character accuracy metrics, micro/macro averages, error breakdown, numeric formatting)
- `server/src/app.js` (Mounted `/api/evaluation` route)
- `flow.md` (Documented FLOW-012 A-M)
- `context.md` (Appended Execution 012)

### Files Preserved
- All 9 detectors (`emailDetector.js`, `phoneDetector.js`, `ipDetector.js`, `ssnDetector.js`, `creditCardDetector.js`, `personDetector.js`, `organizationDetector.js`, `addressDetector.js`, `dobDetector.js`)
- Redaction service (`docxRedactionService.js`)
- Leakage scanner subsystem (`leakageScanner.js`, `leakageAnalyzer.js`, `leakageReport.js`)
- Ingestion & parsing modules (`documentService.js`, `docxParserService.js`)
- Express app & routes (`app.js`, `healthRoutes.js`, `documentRoutes.js`)
- React frontend components (`App.jsx`, `DocumentUploadPlaceholder.jsx`)

### Known Limitations
- Evaluator evaluates gold annotations against model predictions; complete prospectus gold annotation dataset remains marked `PARTIAL` pending complete 127-page annotation.

### Current System State
- Complete pipeline operational: Ingestion -> Parsing -> 9-Category PII Detection -> Validation -> Normalization -> Replacement Plan Mapping -> OpenXML DOCX Redaction -> Post-Redaction Leakage Scan -> Formal PII Evaluation Engine (`POST /api/evaluation/run`).
