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
Strengthen document extraction, source location mapping, OpenXML run-level breakdown (`<w:r>`), character offset conventions (`start` inclusive, `end` exclusive), and location determinism for downstream PII detection and eventual redaction. Scope strictly excludes PII detection, regex patterns, NER models, replacement, or evaluation logic.

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

### Starting State
- Full 9-category PII detection engine active in pure JavaScript at `POST /api/documents/:documentId/detect`.
- All 5 deterministic and 4 contextual detectors operational.

### Canonical Entity Schema Contract
Every entity emitted by the system adheres strictly to the canonical contract:
```json
{
  "id": "entity-u00030-0",
  "type": "EMAIL",
  "text": "cs.connect@kshinternational.com",
  "start": 8,
  "end": 39,
  "detector": "email",
  "confidence": 1.0,
  "normalizedValue": "cs.connect@kshinternational.com",
  "source": {
    "unitId": "unit-00030",
    "unitType": "table-cell",
    "location": {
      "documentId": "doc_1786622697521_f7e04c92f688",
      "tableIndex": 0,
      "rowIndex": 2,
      "cellIndex": 3,
      "paragraphIndex": 0
    }
  }
}
```

### Normalization Design
- **Module**: `server/src/services/piiNormalizationService.js`
- **Behavior**: Computes type-specific canonical comparison values without mutating original source `text`, `start`, or `end`:
  - `EMAIL`: Lowercase trimmed string (`john.doe@example.com`).
  - `PHONE`: Strips spaces, hyphens, brackets, dots (`+919876543210`).
  - `CREDIT_CARD` / `SSN`: Strips spaces and hyphens (`4111111111111111`).
  - `PERSON` / `ORGANIZATION`: Collapses multiple whitespace, converts to lowercase (`ksh international limited`).
  - `ADDRESS`: Collapses line breaks and spaces, converts to lowercase.
  - `DOB`: Parses unambiguous dates to ISO `YYYY-MM-DD`.

### Validation & Invariant Enforcement
- **Module**: `server/src/services/piiValidationService.js`
- **Offset Invariant**: Enforces `unitText.substring(start, end) === candidate.text`. Candidates failing invariant are rejected with reason `INVALID_OFFSET_INVARIANT`.
- **Rules**: Validates structural fields, non-negative offsets, Luhn checksum for credit cards, IPv4 octets, email syntax, phone digit lengths, address location evidence, and DOB context keywords.
- **Allowlist**: Integrates `allowlistService.js` wrapping `organizationAllowlist.js` to exclude statutory/regulatory bodies (`SEBI`, `BSE`, `NSE`, `RBI`), government ministries (`Government of India`), legal acts (`Companies Act`), and generic committees (`Board of Directors`). Rejections logged with reason `ALLOWLIST_EXCLUDED`.

### Duplicate Occurrence & Canonical Grouping
- **Occurrences**: Identical PII text appearing in distinct document locations (e.g. "KSH International Limited" appearing at 45 different document locations) remains separate physical detection objects in the `entities` array.
- **Canonical Grouping**: Occurrences sharing a `canonicalKey` (`type:normalizedValue`) are grouped in audit report diagnostics (`duplicateOccurrences` count: 1,372).

### Overlap Resolution Strategy
- Collapses exact duplicate candidate spans `[start, end]`.
- Resolves nested/partially overlapping candidate spans using specificity rank hierarchy:
  `EMAIL`/`PHONE`/`CREDIT_CARD`/`SSN`/`IP_ADDRESS` (Rank 5) > `DOB` (Rank 4) > `ADDRESS` (Rank 3) > `PERSON` (Rank 2) > `ORGANIZATION` (Rank 1).
- Preserves adjacent non-overlapping entities (`John Doe john@example.com` -> 2 separate entities).

### Detection Audit System
- **Module**: `server/src/services/piiAuditService.js`
- **Output**: Generates safe, development-only audit diagnostics payload attached to `POST /api/documents/:documentId/detect` response.

### Actual Prospectus Audit Results
Scanned actual 127-page `Red Herring Prospectus.docx` (1.76 MB / 1,844,676 bytes):
- **Processed Text Units**: 4,535 units
- **Raw Candidates Generated**: 2,229 candidates
- **Rejected Candidates**: 0 (all pre-filters passed cleanly)
- **Overlaps Resolved**: 179 candidate overlaps resolved
- **Duplicate Occurrences**: 1,372 repeated occurrences
- **Canonical Entities**: 678 unique canonical PII entities
- **Final Validated PII Entities**: 2,050 entities
  - `EMAIL`: 52
  - `PHONE`: 12
  - `IP_ADDRESS`: 0
  - `SSN`: 0
  - `CREDIT_CARD`: 0
  - `PERSON`: 1,480
  - `ORGANIZATION`: 493
  - `ADDRESS`: 13
  - `DOB`: 0

### Positive & Negative Sanity Checks
- **Positive Sanity Checks**:
  - `cs.connect@kshinternational.com` -> Detected as `EMAIL`.
  - `+91 20 4505 3237` -> Detected as `PHONE`.
  - `Sarthak Malvadkar` -> Detected as `PERSON`.
  - `KSH International Limited` -> Detected as `ORGANIZATION`.
  - `11/3, 11/4 and 11/5, Village Birdewadi... Pune – 410 501` -> Detected as `ADDRESS`.
  - `Date of Birth: 12/05/1979` -> Detected as `DOB` (`12/05/1979`).
- **Negative Sanity Checks**:
  - `SEBI`, `BSE`, `NSE`, `Companies Act`, `Board of Directors` -> Rejected by allowlist (0 false PII detections).
  - `U28129PN1979PLC141032` (CIN), `INM000013004` (SEBI Reg) -> Rejected (0 false `SSN`/`CREDIT_CARD`).
  - `410 501` (PIN code) -> Rejected (0 false `PHONE`).
  - `Mumbai`, `Maharashtra` alone -> Rejected (0 false `ADDRESS`).
  - `December 16, 2025` (no DOB context), `FY 2024-25` -> Rejected (0 false `DOB`).

### Automated Unit & Integration Test Results
Executed automated test runner `server/tests/test_execution_007.js`:
- **Total Test Suites**: 28 Test Suites
- **Test Execution Status**: **28 PASSED, 0 FAILED**
- **Test Breakdown**:
  1. `Entity Schema`: 3/3 PASSED (Required fields, offset invariant, source location).
  2. `Normalization`: 7/7 PASSED (Email, Phone, Card, Person, Organization, Address, DOB).
  3. `Validation`: 5/5 PASSED (Invalid candidate, invalid offsets, unknown type, missing source, invalid invariant).
  4. `Deduplication & Canonical`: 2/2 PASSED (Exact duplicate collapse, separate physical occurrences preserved).
  5. `Overlap Resolution`: 3/3 PASSED (Nested overlap, exact span overlap by confidence, adjacent entities preserved).
  6. `Context Validation`: 3/3 PASSED (DOB context, Person role context, Address label evidence).
  7. `Allowlist Service`: 2/2 PASSED (Allowlist exclusion, non-allowlisted company detectable).
  8. `Integration Audit`: 3/3 PASSED (Audit report generation, 100% offset invariant verification, source file immutability).
- **Frontend Compilation Build (`npx vite build`)**: **PASSED** (1.07s).

### Formal Evaluation Boundary
- **Explicit Statement**: Formal precision, recall, accuracy, and F1 scores have **NOT** been calculated in Execution 007 because a gold-standard annotated benchmark dataset has not yet been established. The audit report provides detection diagnostics only.

### Performance Metrics
- **Total Processing Time**: 5,621 ms (~5.6 seconds) for 127 pages / 1.76 MB DOCX.

### Security & Privacy
- Local execution confirmed: 0 network calls to external APIs.
- Privacy maintained: Raw PII values are NOT logged to console or committed in production endpoints. Audit reports summarize diagnostics using counts and metadata.

### Files Created in Execution 007
- `server/src/services/allowlistService.js`
- `server/src/services/piiNormalizationService.js`
- `server/src/services/piiValidationService.js`
- `server/src/services/piiAuditService.js`
- `server/tests/test_execution_007.js`

### Files Modified in Execution 007
- `server/src/services/piiDetectionService.js` (Integrated validation, normalization, canonical contracts, and audit reporting)
- `server/src/controllers/documentController.js` (Included audit summary object in detect API response)
- `flow.md` (Documented FLOW-007 A-H)
- `context.md` (Appended Execution 007 results)

### Files Preserved
- All 9 detectors (`emailDetector.js`, `phoneDetector.js`, `ipDetector.js`, `ssnDetector.js`, `creditCardDetector.js`, `personDetector.js`, `organizationDetector.js`, `addressDetector.js`, `dobDetector.js`)
- Ingestion & parsing modules (`documentService.js`, `docxParserService.js`)
- Express app & routes (`app.js`, `healthRoutes.js`, `documentRoutes.js`)
- React frontend components (`App.jsx`, `DocumentUploadPlaceholder.jsx`)

### Known Limitations
- Synthetic replacement, fake identity generation, DOCX text reconstruction, and formal precision/recall metrics are intentionally deferred per execution scope.

### Current System State
- Full 9-category PII detection pipeline with normalization, validation, offset invariant enforcement, canonical duplicate grouping, conflict resolution, and audit diagnostics operational at `POST /api/documents/:documentId/detect`.

### Next Recommended Step
Proceed to **SYNTHETIC DATA REPLACEMENT & DOCX REDACTION ENGINE**:
1. Implement synthetic replacement generator (`server/src/services/syntheticReplacementService.js`) to map detected canonical entities to realistic synthetic substitutes (fake names, emails, phones, addresses, company names).
2. Build OpenXML DOCX text run replacement engine to generate redacted `.docx` files.
