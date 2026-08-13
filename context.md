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

### Starting State
- Active MERN architecture foundation in pure JavaScript.
- Upload (`POST /api/documents/upload`), OpenXML parser (`POST /api/documents/:documentId/parse`), and source location mapping active.

### Detection Architecture
```
server/src/
├── detectors/
│   ├── emailDetector.js        (EMAIL detector)
│   ├── phoneDetector.js        (PHONE detector)
│   ├── ipDetector.js           (IP_ADDRESS detector)
│   ├── ssnDetector.js          (SSN detector)
│   └── creditCardDetector.js   (CREDIT_CARD detector + Luhn checksum)
├── services/
│   └── piiDetectionService.js  (Aggregation, overlap resolution, source mapping)
└── controllers/
    └── documentController.js   (POST /api/documents/:documentId/detect)
```

### Entity Schema
```json
{
  "type": "EMAIL",
  "text": "cs.connect@kshinternational.com",
  "start": 8,
  "end": 39,
  "confidence": 1.0,
  "detector": "email",
  "source": {
    "unitId": "unit-00030",
    "type": "table-cell",
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

### Email Strategy
- Practical RFC pattern: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g`.
- Strips trailing punctuation (`.`, `,`, `;`, `:`, `!`, `?`).

### Phone Strategy
- Matches +91 Indian and international formats (`+91 20 4505 3237`, `+91 22 40094400`, `+91 81081 14949`, `9876543210`).
- Strict false positive protections reject 6-digit Indian postal codes (e.g. `410 501`, `410501`), Corporate Identity Numbers (CIN e.g. `U28129PN1979PLC141032`), SEBI registration numbers, share quantities, and financial values.
- Phone keywords (`Tel`, `Telephone`, `Mobile`, `Phone`, `Contact`, `Fax`, `+91`, `Call`) provide context scoring.

### IP Strategy
- Validates 4-octet IPv4 candidates against valid numeric range (`0–255`).
- Filters out software version strings (e.g. `v1.4.5`, `1.0.0`).

### SSN Strategy
- Detects formatted US SSNs (`XXX-XX-XXXX`) with valid area, group, and serial range checks.
- Unhyphenated 9-digit candidates require explicit context keywords (`SSN`, `Social Security`).

### Credit Card Strategy
- Matches candidate 13–19 digit sequences (formatted with spaces/hyphens or raw digits).
- Validates candidate numbers using the **Luhn Algorithm Checksum**. Non-Luhn candidate numbers are strictly rejected.

### Validation Rules & Invariant
- **Substring Invariant**: Every entity strictly satisfies `unit.text.substring(start, end) === entity.text`.
- **Luhn Validation**: Credit card candidates must satisfy Luhn checksum formula.
- **Postal Code & CIN Rejection**: 6-digit postal numbers and CIN codes are filtered out from phone candidates.

### False Positive Strategy
- Numeric detectors check surrounding 30-character context window for legal/financial keywords (`CIN`, `SEBI`, `shares`, `rupees`, `PIN`, `Postal Code`).

### Overlap Strategy
- Candidate spans `[start, end]` are resolved using `piiDetectionService.resolveOverlaps()`: if two spans overlap, the engine prefers the longer entity or the higher confidence candidate.

### Source Mapping
- Every detected entity retains `source.unitId`, `source.type` (`"paragraph"`, `"table-cell"`, `"header"`, `"footer"`), and `source.location` (`tableIndex`, `rowIndex`, `cellIndex`, `paragraphIndex`).

### Actual Prospectus Results
Scanned 127-page `Red Herring Prospectus.docx` (1.84 MB):
- **EMAIL**: 52 detected entities
- **PHONE**: 12 detected entities
- **IP_ADDRESS**: 0 detected entities
- **SSN**: 0 detected entities
- **CREDIT_CARD**: 0 detected entities
- **Total Entities Detected**: 64 entities

### Unit & Integration Tests
Executed automated test runner `scratch/test_execution_005.js`:
1. **Email Detector Unit Test**: PASSED (3 valid emails detected, exact substring match).
2. **Phone Detector Unit Test**: PASSED (2 valid phones detected, postal code '410 501' rejected).
3. **IP Address Unit Test**: PASSED (Valid IPv4 '192.168.1.1' detected, version '1.4.5' rejected).
4. **SSN Unit Test**: PASSED (Formatted SSN detected, invalid area 000 rejected).
5. **Credit Card Unit Test**: PASSED (Valid Luhn card detected, invalid Luhn card rejected).
6. **Negative Control Test**: PASSED (Company name *"KSH International Limited"* produced 0 false PII detections).
7. **RHP Integration Test**: PASSED (52 emails, 12 phones detected).
8. **Read-Only Document Integrity Test**: PASSED (Source file size 1,844,676 bytes unchanged).

### Test Results
- **8 Test Suites**: **PASSED** (0 failures).
- **Frontend Compilation Build (`npx vite build`)**: **PASSED** (1.07s).

### False Positives / False Negatives Observed
- Formal precision/recall evaluation has not yet been implemented.

### Security Considerations
- PII detection operates in-memory. Raw PII values are NOT logged to console or returned in public API summary responses (API returns aggregate counts and truncated preview snippets).

### Known Limitations
- PERSON, COMPANY/ORGANIZATION, ADDRESS, and DOB entity categories are explicitly omitted per Execution 005 scope.

### Current System State
- Operational MERN architecture with DOCX upload, OpenXML parser, and deterministic PII detection engine (`POST /api/documents/:documentId/detect`).

### Next Recommended Step
Proceed to **EXECUTION 006 — ADVANCED ENTITY DETECTION (PERSON, ORGANIZATION, ADDRESS, DOB)** or **SYNTHETIC REPLACEMENT & REDACTION ENGINE**:
1. Implement NER / dictionary-assisted detection for Full Names, Company Names, Physical Addresses, and Dates of Birth.
2. Build synthetic data replacement mapping engine (`server/src/services/syntheticReplacementService.js`).
