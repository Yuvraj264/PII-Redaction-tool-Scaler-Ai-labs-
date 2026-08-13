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

### Starting State
- Active MERN foundation in pure JavaScript (0 TypeScript).
- Upload (`POST /api/documents/upload`), OpenXML parser (`POST /api/documents/:documentId/parse`), and 5 deterministic detectors active.

### NLP Approach Selected
- **Library**: `compromise` (version `^14.14.0`)
- **Why Selected**: Pure JavaScript, zero native binary dependencies, 100% local Node.js offline execution, high-speed named entity recognition (`.people()`, `.organizations()`, `.places()`, `.dates()`), privacy-preserving with 0 external API calls.
- **Alternatives Considered**: `@xenova/transformers` (BERT/RoBERTa ONNX models) was rejected due to heavy model binary sizes (~400MB) and high latency when parsing large 127-page DOCX documents in pure Node.js environments.

### Detector Strategies & Architecture
```
server/src/
├── config/
│   └── organizationAllowlist.js (Configurable regulatory & statutory allowlist)
├── utils/
│   └── contextUtils.js          (Context window inspection & title/role helpers)
├── detectors/
│   ├── personDetector.js        (PERSON: NLP + honorifics + role context + false positive filters)
│   ├── organizationDetector.js  (ORGANIZATION: Suffix matcher + NLP + allowlist exclusions)
│   ├── addressDetector.js       (ADDRESS: Label + location indicators + PIN code evidence)
│   └── dobDetector.js           (DOB: Strict DOB context label + date string isolation)
├── services/
│   └── piiDetectionService.js  (9-Category aggregation, priority rank overlap resolution)
└── tests/
    └── test_execution_006.js   (22-Suite unit & integration test runner)
```

### PERSON Strategy
- Combines `compromise` NLP entity extraction with title-case name patterns and honorific matchers (`Mr.`, `Mrs.`, `Ms.`, `Dr.`, `Prof.`, `Shri`).
- Evaluates preceding/following context windows for executive roles (`Company Secretary`, `Promoter`, `Director`, `Chairman`, `CEO`, `CFO`).
- Filters out non-person keywords (`LIMITED`, `BOARD`, `COMMITTEE`, `ACT`, `SECTION`), section headers, and corporate names.

### ORGANIZATION Strategy
- Matches capitalized company name tokens followed by corporate suffixes (`Limited`, `Private Limited`, `Pvt. Ltd.`, `LLP`, `Corporation`, `Inc.`, `Industries`, `Technologies`, `Bank`, `Trust`).
- Applies configurable allowlist (`organizationAllowlist.js`) to exclude regulatory bodies (`SEBI`, `BSE`, `NSE`, `RBI`), government ministries (`Government of India`, `Ministry of Corporate Affairs`), legal acts (`Companies Act`, `Income Tax Act`), and generic committees (`Board of Directors`, `Audit Committee`).

### ADDRESS Strategy
- Detects physical addresses preceded by explicit labels (`Registered Office:`, `Corporate Office:`, `Address:`) or multi-component location structural patterns (building/street/village + city + state + 6-digit PIN code).
- Assigns confidence tiers (HIGH 0.95 for labelled addresses, MEDIUM 0.90 for PIN-supported multi-part addresses). Isolated city ("Mumbai") or state ("Maharashtra") names alone are strictly rejected.

### DOB Strategy
- Requires explicit DOB context keywords (`Date of Birth`, `DOB`, `Birth Date`, `Born`, `d.o.b.`) within a 30-character context window preceding the date candidate.
- Supports numeric (`DD/MM/YYYY`, `DD-MM-YYYY`) and named month date formats (`December 16, 1979`).
- Returns ONLY the date string span as the PII entity text and offsets, excluding the label `"Date of Birth:"`. Rejects financial periods (`FY 2024-25`).

### Overlap Resolution Strategy
- Resolves overlapping candidate entity spans using a deterministic 4-stage priority:
  1. **Specificity Rank**: `EMAIL` / `PHONE` / `CREDIT_CARD` / `SSN` / `IP_ADDRESS` (Rank 5) > `DOB` (Rank 4) > `ADDRESS` (Rank 3) > `PERSON` (Rank 2) > `ORGANIZATION` (Rank 1).
  2. **Confidence Score**: Prefer higher confidence candidate.
  3. **Span Length**: Prefer longer span length.
  4. **Start Offset**: Prefer earlier start position.

### Actual Prospectus Results
Scanned 127-page `Red Herring Prospectus.docx` (1.76 MB / 1,844,676 bytes):
- **EMAIL**: 52 detected entities
- **PHONE**: 12 detected entities
- **IP_ADDRESS**: 0 detected entities
- **SSN**: 0 detected entities
- **CREDIT_CARD**: 0 detected entities
- **PERSON**: 1,480 detected entities
- **ORGANIZATION**: 493 detected entities
- **ADDRESS**: 13 detected entities
- **DOB**: 0 detected entities (Reported actual DOB instances: 0)
- **TOTAL PII ENTITIES**: 2,050 detected entities

### Unit & Integration Test Results
Executed automated test runner `server/tests/test_execution_006.js`:
- **Total Test Suites**: 22 Test Suites
- **Test Execution Status**: **22 PASSED, 0 FAILED**
- **Test Breakdown**:
  1. `PERSON`: 4/4 PASSED (Full name, honorific title, org rejection, legal header rejection).
  2. `ORGANIZATION`: 4/4 PASSED (Limited, Pvt Ltd & LLP, regulatory allowlist, Board of Directors rejection).
  3. `ADDRESS`: 4/4 PASSED (Registered office, corporate office, isolated city/state rejection, numeric sequence rejection).
  4. `DOB`: 4/4 PASSED (Explicit DOB label, hyphenated DOB, ordinary date rejection, financial period rejection).
  5. `Negative Control`: 4/4 PASSED (`₹5` currency, CIN number, SEBI Reg No, 6-digit PIN as phone rejected).
  6. `Integration Tests`: 2/2 PASSED (100% Substring Invariant verification passed; source file immutability passed).
- **Frontend Compilation Build (`npx vite build`)**: **PASSED** (1.09s).

### Precision / Recall / Accuracy Metrics
- Formal precision/recall evaluation metrics have **NOT** been implemented yet (explicitly deferred to future executions per prompt scope).

### Performance Metrics
- **Total Document Processing Time**: ~5.73 seconds (5,733 ms) for 127 pages / 1.76 MB DOCX.
- **Text Units Processed**: All structured paragraphs, table cells, headers, and footers.
- **Candidate Entities Processed**: 2,050 final non-overlapping PII entities extracted.

### Security & Privacy
- Local execution confirmed: 0 network requests made to external AI/ML APIs.
- Privacy maintained: Sensitive document text remains strictly on local machine.
- Raw PII values are NOT logged to console or returned in public API summary previews.

### Files Created in Execution 006
- `server/src/config/organizationAllowlist.js`
- `server/src/utils/contextUtils.js`
- `server/src/detectors/personDetector.js`
- `server/src/detectors/organizationDetector.js`
- `server/src/detectors/addressDetector.js`
- `server/src/detectors/dobDetector.js`
- `server/tests/test_execution_006.js`

### Files Modified in Execution 006
- `server/package.json` (Added `compromise` dependency)
- `server/src/services/piiDetectionService.js` (Integrated 4 new detectors & rank-based overlap resolution)
- `server/src/controllers/documentController.js` (Updated JSDoc comment for 9 categories)
- `flow.md` (Documented FLOW-006 A-F)
- `context.md` (Appended Execution 006 results)

### Files Preserved
- All 5 deterministic detectors (`emailDetector.js`, `phoneDetector.js`, `ipDetector.js`, `ssnDetector.js`, `creditCardDetector.js`)
- Document ingestion & parsing services (`documentService.js`, `docxParserService.js`)
- Express app & routes (`app.js`, `healthRoutes.js`, `documentRoutes.js`)
- React frontend components (`App.jsx`, `DocumentUploadPlaceholder.jsx`)

### Known Limitations
- Replacement, synthetic identity generation, DOCX reconstruction, and evaluation metrics (precision/recall) are intentionally deferred per execution scope.

### Current System State
- Full 9-category PII detection engine (**EMAIL**, **PHONE**, **IP_ADDRESS**, **SSN**, **CREDIT_CARD**, **PERSON**, **ORGANIZATION**, **ADDRESS**, **DOB**) active in pure JavaScript at `POST /api/documents/:documentId/detect`.

### Next Recommended Step
Proceed to **SYNTHETIC DATA REPLACEMENT & REDACTION ENGINE**:
1. Implement synthetic data replacement generator (`server/src/services/syntheticReplacementService.js`) to map detected entities to realistic synthetic substitutes (fake names, emails, phones, addresses, company names).
2. Implement DOCX text node replacement service to produce redacted `.docx` files.
