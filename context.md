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

### Why Gold Data Is Required
Accuracy, precision, and recall are only mathematically sound when evaluated against human-verified gold ground-truth datasets. Predictions are candidate suggestions and cannot serve as gold truth.

### Evaluation Unit & Matching Rules
- **Evaluation Unit**: Span-level entity evaluation (`unitId`, `start`, `end`, `type`).
- **Exact Span Match (`TP`)**: Span, type, and source unit match gold annotation exactly.
- **Wrong Type (`WRONG_TYPE`)**: Span matches, but entity type differs (counted as FP for predicted type, FN for gold type).
- **Partial Overlap (`PARTIAL`)**: Overlapping span (`gold.start < pred.end && pred.start < gold.end`) but not exact match (tracked separately, NOT TP).
- **False Positive (`FP`)**: Prediction with no matching gold entity.
- **False Negative (`FN`)**: Gold annotation with no matching prediction.

### Annotation Policies by Category
- **PERSON**: Full person name (e.g. "Sarthak Malvadkar"). Excludes honorifics ("Mr."), job titles ("CEO"), and committee names ("Audit Committee").
- **EMAIL**: Complete email address including domain (e.g. "cs.connect@kshinternational.com").
- **PHONE**: Complete phone string including country code (e.g. "+91 20 4505 3237").
- **ORGANIZATION**: Complete company/legal entity name (e.g. "KSH International Limited"). Excludes statutory/regulatory bodies (SEBI, RBI, Stock Exchanges, ROC) per policy.
- **ADDRESS**: Smallest complete physical address span excluding context labels ("Registered Office:").
- **DOB**: Actual birth date value in birth context (e.g. "12/05/1979"). Excludes date labels ("Date of Birth:").
- **SSN**: Complete 9-digit SSN (e.g. "900-01-0001").
- **CREDIT_CARD**: Complete card number (e.g. "4111-1111-1111-1111").
- **IP_ADDRESS**: Complete IPv4 address (e.g. "192.0.2.1").

### Metric Formulations
- **Precision**: $\text{TP} / (\text{TP} + \text{FP})$
- **Recall**: $\text{TP} / (\text{TP} + \text{FN})$
- **F1-Score**: $2 \times \text{Precision} \times \text{Recall} / (\text{Precision} + \text{Recall})$
- **Entity-Level Accuracy**: $\text{TP} / (\text{TP} + \text{FP} + \text{FN})$
- **Token/Character-Level Accuracy**: $(\text{TP}_{\text{tokens}} + \text{TN}_{\text{tokens}}) / (\text{TP}_{\text{tokens}} + \text{TN}_{\text{tokens}} + \text{FP}_{\text{tokens}} + \text{FN}_{\text{tokens}})$
- **Micro Metrics**: Aggregate TP, FP, FN across all entity types.
- **Macro Metrics**: Average per-type metrics over applicable classes with gold/predictions present.
- **Confusion Matrix**: 2D map tracking predictions vs gold annotations across types.

### Ground-Truth Dataset Validation
`goldDatasetValidator.js` validates:
1. Schema contract structure (`evaluationDatasetSchema.js`).
2. Annotation ID existence & uniqueness.
3. Supported PII entity type.
4. Source unit existence in document.
5. Offset bounds (`start >= 0`, `end > start`, `end <= unitText.length`).
6. Substring text invariant (`unitText.substring(start, end) === annotation.text`).
7. Non-overlapping gold annotations within units.
8. SHA-256 document hash check (`8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929` for Red Herring Prospectus.docx).

### Synthetic Fixture Evaluation Results
Executed evaluation run against `synthetic_gold_dataset.json` (9 annotations across all 9 PII categories):
- **True Positives**: 9
- **False Positives**: 0
- **False Negatives**: 0
- **Micro Precision**: 1.0000 (100%)
- **Micro Recall**: 1.0000 (100%)
- **Micro F1**: 1.0000 (100%)
- **Entity-Level Accuracy**: 1.0000 (100%)
- **Status**: **PASS**

### Prospectus Gold Dataset Status
Created `prospectus_gold_dataset.json` for `Red Herring Prospectus.docx`:
- **Status**: `DEVELOPMENT / PARTIAL GOLD DATASET`
- **Document Hash**: `8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929`
- **Total Text Units in Source**: 4,535 units
- **Verified Annotations**: 8 sample verified annotations across PERSON, EMAIL, ORGANIZATION, and PHONE.
- **Coverage**: Pages 1-15 verified. (Full document annotations ongoing for future benchmark runs).

### Automated Evaluation Test Runner Results
Executed `node server/tests/test_execution_011.js`:
- **Total Test Suites**: 10 Test Suites
- **Status**: **10 PASSED, 0 FAILED**
- **Test Breakdown**:
  1. Exact TP Match: PASSED
  2. False Negative: PASSED
  3. False Positive: PASSED
  4. Wrong Type Match: PASSED
  5. Partial Span Overlap: PASSED
  6. Safe Zero Division Handling: PASSED
  7. Multiple Entity Types Micro/Macro Averages: PASSED
  8. Gold Dataset Invariant Validation: PASSED
  9. Invalid Text Offset Detection: PASSED
  10. Synthetic Evaluation Fixture Run: PASSED
- **Frontend Compilation (`npx vite build`)**: **PASSED** (629ms).

### Files Created in Execution 011
- `server/src/evaluation/policy/annotationPolicy.js`
- `server/src/evaluation/schemas/evaluationDatasetSchema.js`
- `server/src/evaluation/validators/goldDatasetValidator.js`
- `server/src/evaluation/engine/metricsCalculator.js`
- `server/src/evaluation/engine/evaluationEngine.js`
- `server/src/evaluation/loaders/evaluationDatasetLoader.js`
- `server/src/evaluation/data/synthetic_gold_dataset.json`
- `server/src/evaluation/data/prospectus_gold_dataset.json`
- `server/tests/test_execution_011.js`

### Files Modified in Execution 011
- `server/src/controllers/documentController.js` (Added `evaluateDocument` method)
- `server/src/routes/documentRoutes.js` (Registered `POST /api/documents/:documentId/evaluate`)
- `flow.md` (Documented FLOW-011 A-J)
- `context.md` (Appended Execution 011)

### Known Limitations
- The prospectus gold dataset is marked `DEVELOPMENT / PARTIAL GOLD DATASET` as complete manual annotation of all 127 pages is in progress.

### Current System State
- Complete pipeline operational: Ingestion -> Parsing -> 9-Category PII Detection -> Validation -> Normalization -> Replacement Plan Mapping -> OpenXML DOCX Redaction -> Post-Redaction Leakage Scan -> Gold Dataset Evaluation (`POST /api/documents/:documentId/evaluate`).
