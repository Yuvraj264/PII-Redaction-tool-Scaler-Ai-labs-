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
Implement a dedicated **Synthetic PII Replacement Mapping Subsystem** in pure JavaScript. Generate deterministic synthetic alternatives for all 9 PII categories, enforce 1-to-1 replacement consistency for repeated entity occurrences, prevent synthetic replacement collisions, build descending-offset sorted Replacement Plans, and expose dev API endpoint `POST /api/documents/:documentId/replacement-plan`. Explicitly enforce the read-only boundary: **DOCX modification, text node substitution, DOCX reconstruction, redaction, leakage scanning, and evaluation metrics are NOT implemented in Execution 008.**

### Starting State
- 9-category PII detection pipeline with normalization, validation, offset invariant enforcement, canonical grouping, conflict resolution, and audit reporting active in pure JavaScript.

### Replacement Architecture
```
server/src/replacement/
├── replacementRegistry.js        (Bidirectional canonicalKey ↔ replacement mapping)
├── replacementService.js         (Replacement Plan builder & API service)
└── generators/
    ├── personGenerator.js        (Synthetic Indian names: Arjun Mehta, Riya Sharma)
    ├── emailGenerator.js         (Safe example.com emails: arjun.mehta@example.com)
    ├── phoneGenerator.js         (Synthetic Indian phone numbers: +91 98765 01001)
    ├── organizationGenerator.js (Synthetic corporate names: Apex Meridian Technologies Private Limited)
    ├── addressGenerator.js      (Synthetic physical addresses: 42 Industrial Estate Road...)
    ├── dobGenerator.js          (Valid synthetic birth dates: 1985-04-12)
    ├── ssnGenerator.js          (Test SSNs in 900-XX-XXXX test range)
    ├── creditCardGenerator.js   (Luhn-valid test card numbers: 4111-1111-1111-1111)
    └── ipGenerator.js           (Documentation IPv4 addresses: 192.0.2.1, 198.51.100.1)
```

### Canonical Identity Strategy
- Uses `piiNormalizationService.getCanonicalKey(type, text)` to derive deterministic string key e.g. `organization:ksh international limited`.

### Replacement Registry
- **Module**: `server/src/replacement/replacementRegistry.js`
- **Bidirectional Maps**: `canonicalMap` (`canonicalKey` -> `replacement`) and `reverseMap` (`replacement` -> `canonicalKey`).
- **Consistency**: All occurrences of the same canonical key (e.g. 50 occurrences of "Sarthak Malvadkar") map to the exact same synthetic replacement ("Arjun Mehta").
- **Collision Prevention**: If candidate replacement is already in `reverseMap`, generator increments counter to produce a unique replacement.

### Generators Strategy
- **PERSON**: Realistic synthetic names from pool (`Arjun Mehta`, `Riya Sharma`). Never uses names from source document.
- **EMAIL**: Safe `@example.com` emails (`arjun.mehta@example.com`).
- **PHONE**: Synthetic Indian numbers in safe reserved series (`+91 98765 01001`).
- **ORGANIZATION**: Synthetic companies (`Apex Meridian Technologies Private Limited`) preserving legal suffixes (`Limited`, `Private Limited`, `LLP`).
- **ADDRESS**: Synthetic physical addresses (`42 Industrial Estate Road...`).
- **DOB**: Valid birth dates (`1985-04-12`) strictly different from original text.
- **SSN**: Test SSNs (`900-01-0001` in US SSN test range 900-XX-XXXX).
- **CREDIT_CARD**: Luhn-valid test cards (`4111-1111-1111-1111`).
- **IP_ADDRESS**: Documentation IPv4 addresses (`192.0.2.1` in RFC 5737 doc block).

### Determinism & Cross-Run Decision
- **Same Document Run**: 100% deterministic consistency guaranteed.
- **Cross-Run Decision**: Document run state is self-contained per processing run; global persistent replacement database across unrelated files is intentionally omitted to avoid cross-document data coupling.

### Replacement Plan & Descending Ordering
- **Module**: `server/src/replacement/replacementService.js`
- **Sorting Rule**: Replacements within each text unit plan are sorted by `start` offset **DESCENDING** (e.g. offset 100 before offset 20) to prepare for safe downstream end-to-beginning text substitution without invalidating earlier offsets.
- **Length Changes**: Explicitly tracks `originalLength`, `replacementLength`, and `lengthDelta`.

### Actual Prospectus Results
Scanned actual 127-page `Red Herring Prospectus.docx` (1.76 MB / 1,844,676 bytes):
- **Execution Time**: 2,963 ms (~2.9 seconds)
- **Total Entities Detected**: 2,050 entities
- **Canonical Entities**: 678 unique canonical PII entities
- **Synthetic Replacements**: 678 unique non-colliding synthetic replacements
- **Unit Plans Generated**: 1,050 text unit plans
- **Unit Replacement Ordering**: 100% sorted by `start` offset DESCENDING

### Unit & Integration Test Results
Executed automated test runner `server/tests/test_execution_008.js`:
- **Total Test Suites**: 21 Test Suites
- **Test Execution Status**: **21 PASSED, 0 FAILED**
- **Test Breakdown**:
  1. `Canonicalization`: 4/4 PASSED (Email case, phone formatting, person spacing, different people).
  2. `Registry & Collision`: 3/3 PASSED (First occurrence, second occurrence reuse, collision prevention).
  3. `Synthetic Generators`: 9/9 PASSED (Person, Email, Phone, Organization, Address, DOB, SSN, Credit Card, IP).
  4. `Safety & Ordering`: 2/2 PASSED (Replacement safety/non-leakage, descending start offset ordering).
  5. `Integration`: 3/3 PASSED (Replacement Plan summary metrics, unit plan ordering, source file immutability).
- **Frontend Compilation Build (`npx vite build`)**: **PASSED** (867ms).

### Security & Privacy
- Local execution confirmed: 0 network calls to external APIs.
- Privacy maintained: Raw PII text is NOT logged or exposed through public endpoints. Dev API endpoint returns safe metadata previews.

### Files Created in Execution 008
- `server/src/replacement/replacementRegistry.js`
- `server/src/replacement/replacementService.js`
- `server/src/replacement/generators/personGenerator.js`
- `server/src/replacement/generators/emailGenerator.js`
- `server/src/replacement/generators/phoneGenerator.js`
- `server/src/replacement/generators/organizationGenerator.js`
- `server/src/replacement/generators/addressGenerator.js`
- `server/src/replacement/generators/dobGenerator.js`
- `server/src/replacement/generators/ssnGenerator.js`
- `server/src/replacement/generators/creditCardGenerator.js`
- `server/src/replacement/generators/ipGenerator.js`
- `server/tests/test_execution_008.js`

### Files Modified in Execution 008
- `server/src/controllers/documentController.js` (Added `generateReplacementPlan` endpoint controller)
- `server/src/routes/documentRoutes.js` (Added `POST /api/documents/:documentId/replacement-plan` route)
- `flow.md` (Documented FLOW-008 A-F)
- `context.md` (Appended Execution 008 results)

### Files Preserved
- All 9 detectors (`emailDetector.js`, `phoneDetector.js`, `ipDetector.js`, `ssnDetector.js`, `creditCardDetector.js`, `personDetector.js`, `organizationDetector.js`, `addressDetector.js`, `dobDetector.js`)
- Validation & audit services (`piiValidationService.js`, `piiNormalizationService.js`, `allowlistService.js`, `piiAuditService.js`)
- Ingestion & parsing modules (`documentService.js`, `docxParserService.js`)
- Express app & routes (`app.js`, `healthRoutes.js`, `documentRoutes.js`)
- React frontend components (`App.jsx`, `DocumentUploadPlaceholder.jsx`)

### Known Limitations
- **DOCX modification is not implemented in Execution 008.** In-place text node substitution and redacted DOCX generation are deferred to Execution 009.

### Current System State
- Full 9-category PII detection pipeline with normalization, validation, canonical duplicate grouping, conflict resolution, audit diagnostics, and synthetic replacement mapping active at `POST /api/documents/:documentId/replacement-plan`.

### Next Recommended Step
Proceed to **DOCX REDACTION & TEXT SUBSTITUTION ENGINE**:
1. Implement OpenXML XML run node text substitution service (`server/src/services/docxRedactionService.js`).
2. Replace source text runs according to the Replacement Plan, reconstruct valid `.docx` zip packages, and emit redacted DOCX files (`GET /api/documents/:documentId/download`).
