# PII Redaction Tool — Engineering Context

Cumulative historical log of engineering decisions, system changes, test results, and architecture milestones.

---

## Execution 001

### Objective
Safely establish the production-grade MERN project foundation (JavaScript ONLY) and documentation architecture for the Scaler AI Labs PII Redaction Tool. Scope strictly excludes PII detection, redaction engine, or evaluation engine.

### Starting Repository State
- Repository directory: `/Users/yuvraj/Desktop/projects/scaler ai labs Pii engine `
- Initial state: Empty directory (0 files, 0 folders).

### Changes Made
- Established standard MERN workspace structure (`client/`, `server/`, `docs/`).
- Initialized Node.js Express backend with environment configuration, health endpoint (`GET /api/health`), global error handling, 404 handler, and non-blocking MongoDB connection utility.
- Initialized React (JSX) frontend shell using Vite with dark glassmorphism design system, health status monitor, and document upload UI placeholder.
- Created core system flow documentation (`flow.md`) separating implemented vs planned components.
- Created historical engineering decision log (`context.md`).

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

### Starting State
- Operational MERN stack with DOCX upload (`POST /api/documents/upload`) and basic structural parsing (`POST /api/documents/:documentId/parse`).
- OpenXML parser active in `server/src/services/docxParserService.js`.

### Previous Parser Architecture
- Basic paragraph and table cell text extraction without granular OpenXML run breakdown (`<w:r>`) or formal character offset convention.

### Current Parser Architecture
- **Enhanced OpenXML Structural Parser**:
  - Unzips `.docx` in-memory with `adm-zip`.
  - Parses OpenXML tree with `fast-xml-parser`.
  - Extracts paragraph text runs (`<w:r> -> <w:t>`).
  - Extracts table cell text runs (`<w:tbl> -> <w:tr> -> <w:tc> -> <w:p> -> <w:r>`).
  - Attaches `runs` array (`[{ index: 0, text: "..." }]`) to every text unit.
  - Implements explicit 0-indexed character offset helper `extractSubstring(unit, start, end)`.

### DOCX Library Behavior
- `adm-zip` + `fast-xml-parser` exposes OpenXML `<w:r>` run elements cleanly. Paragraphs containing styled text, hyperlinks, or bold headings produce separate run objects preserving original text sequence.

### Source Mapping Design
- **Paragraphs**: `{ documentId, paragraphIndex }`
- **Table Cells**: `{ documentId, tableIndex, rowIndex, cellIndex, paragraphIndex }`
- **Headers**: `{ documentId, headerId, paragraphIndex }`
- **Footers**: `{ documentId, footerId, paragraphIndex }`

### Run-Level Findings
- A single paragraph in the Red Herring Prospectus contains an average of 4.9 OpenXML formatting runs (`<w:r>`).
- Capturing `runs` objects (`[{ index: 0, text: "..." }]`) enables downstream redaction to operate at the individual run level or paragraph level when performing synthetic replacements.

### Offset Strategy
- Standardized offset indexing: **`start` inclusive**, **`end` exclusive**.
- Guarantee: `unit.text.substring(start, end)` strictly evaluates to target entity text string.

### Normalization Strategy
- **`text`**: Raw extracted text string (100% untouched).
- **`normalizedText`**: Collapses consecutive whitespace (`\s+` -> `' '`) and trims leading/trailing spaces for search matching.

### Table Findings
- All 76 tables and 3,225 table cells in `Red Herring Prospectus.docx` maintain deterministic grid location coordinates (`tableIndex`, `rowIndex`, `cellIndex`). Contact tables on Page 1 are fully extracted with zero loss.

### Duplicate Handling
- Repeated occurrences of identical text (e.g. repeated company name *"KSH INTERNATIONAL LIMITED"*) maintain separate, distinct, location-specific metadata objects (`unit-00012` vs `unit-00024`).

### Actual Prospectus Test & Measured Results
- **Document Tested**: `/Users/yuvraj/Downloads/Red Herring Prospectus.docx`
- **File Size**: 1,844,676 bytes (1.84 MB)
- **Parse Duration**: ~1.6 seconds
- **Paragraph Count**: 1,006
- **Table Count**: 76
- **Table Cell Count**: 3,225
- **Text Unit Count**: 4,535
- **Total Character Count**: 321,112 characters
- **Total Run Count**: 4,980 formatting runs
- **Header Count**: 75
- **Footer Count**: 74

### Tests Executed & Results

Executed automated 16-point test harness (`scratch/test_execution_004.js`):

| Test ID | Description | Status | Result |
| :--- | :--- | :---: | :---: |
| **TEST-001** | Valid DOCX archive loading | 200 OK | **PASSED** (4,535 units) |
| **TEST-002** | Paragraph extraction count (> 500) | 200 OK | **PASSED** (1,006 paragraphs) |
| **TEST-003** | Table grid extraction count (> 10 tables, > 100 cells) | 200 OK | **PASSED** (76 tables, 3,225 cells) |
| **TEST-004** | Sequential stable unit IDs (`unit-00001`) | 200 OK | **PASSED** (4,535 sequential IDs) |
| **TEST-005** | Deterministic location metadata presence | 200 OK | **PASSED** |
| **TEST-006** | Character offset convention (`start` inclusive, `end` exclusive) | 200 OK | **PASSED** (`unit.text.substring(0, 25)`) |
| **TEST-007** | Representative person text search (*"Ketan Shah"*) | 200 OK | **PASSED** (Unit `unit-00759`) |
| **TEST-008** | Representative email search (*"cs.connect@kshinternational.com"*) | 200 OK | **PASSED** (Unit `unit-00030`) |
| **TEST-009** | Representative telephone search | 200 OK | **PASSED** (Unit `unit-00029`) |
| **TEST-010** | Representative company search (*"KSH INTERNATIONAL LIMITED"*) | 200 OK | **PASSED** (Unit `unit-00012`) |
| **TEST-011** | Representative address search (*"Registered Office"*) | 200 OK | **PASSED** (Unit `unit-00025`) |
| **TEST-012** | Multi-occurrence location independence | 200 OK | **PASSED** (Distinct locations for `unit-00012` & `unit-00024`) |
| **TEST-013** | Non-existent document ID error handling | 404 Not Found | **PASSED** |
| **TEST-014** | Source DOCX read-only file integrity | 200 OK | **PASSED** (Source size 1844676 B unchanged) |
| **TEST-015** | `GET /api/health` regression | 200 OK | **PASSED** |
| **TEST-016** | `POST /api/documents/upload` regression | 200 OK | **PASSED** |
| **BUILD** | Frontend production compilation (`npx vite build`) | Exit Code 0 | **PASSED** (1.10s) |

### Bugs Found & Fixes Made
- None in Execution 004 (errorHandler fix applied during Execution 003 maintained).

### Tradeoffs
- Run-level breakdown increases in-memory structure size slightly, but provides exact downstream targeting for text replacement.

### Known Limitations
- PII detection engine, regex patterns, and synthetic entity replacement are intentionally excluded per Execution 004 scope.

### Future Requirements For Redaction
- Downstream redaction engine will use `unit.location` and character offsets (`start`, `end`) to replace detected PII spans with synthetic placeholders in OpenXML runs (`<w:r> -> <w:t>`).

### Current System State
- MERN architecture foundation active.
- Document upload (`POST /api/documents/upload`) and structured parser (`POST /api/documents/:documentId/parse`) operational.
- Parser extracts paragraphs, tables, runs, and headers/footers with deterministic location metadata in ~1.6s.

### Next Recommended Step
Proceed to **EXECUTION 005 — PII DETECTION ENGINE**:
1. Create `server/src/services/piiDetectorService.js`.
2. Implement pattern matchers and rule sets for the 9 required categories (Full Names, Emails, Phone Numbers, Company Names, Physical Addresses, SSNs, Credit Cards, Dates of Birth, IP Addresses).
3. Bind detection engine to extracted text units from `docxParserService`.
