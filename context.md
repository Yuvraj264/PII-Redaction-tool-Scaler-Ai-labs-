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

### Starting State
- Active MERN stack foundation in 100% pure JavaScript.
- Backend server active on port 5001 serving `GET /api/health`.
- Client application running on Vite port 5173 connected to backend health monitor.

### Architecture Before Changes
- Express API server with `healthRoutes.js`, `healthController.js`, `notFoundHandler.js`, `errorHandler.js`.
- Basic static UI shell in React.

### Changes Made
- Configured multipart form-data upload middleware using `multer`.
- Created centralized upload configuration module (`server/src/config/uploadConfig.js`).
- Created upload middleware with extension, MIME type, size limit validation, and sanitized filename generation (`server/src/middleware/uploadMiddleware.js`).
- Created document metadata service (`server/src/services/documentService.js`).
- Created document upload controller (`server/src/controllers/documentController.js`).
- Created document routes module (`server/src/routes/documentRoutes.js`) mapping `POST /api/documents/upload`.
- Mounted `documentRoutes` in Express `app.js`.
- Updated root `.gitignore` to exclude `uploads/` and `server/uploads/`.
- Upgraded React `DocumentUploadPlaceholder.jsx` component into an interactive drag-and-drop document upload UI with real-time metadata display and error feedback.
- Created automated test suite script (`test_execution_002.js`) verifying upload validation, security, and integration with the actual 127-page assignment document (`Red Herring Prospectus.docx`).
- Updated `flow.md` adding `FLOW-002 — DOCX Upload Flow`.

---

## Execution 003

### Objective
Build a read-only, high-precision DOCX parser and structured extraction service capable of processing 100+ page DOCX files (such as the 127-page Red Herring Prospectus). The parser extracts paragraphs, tables (rows/cells), and headers/footers into an internal structured document model with stable IDs and location metadata without modifying the source DOCX file or running PII detection.

### Starting State
- Active MERN stack foundation in pure JavaScript.
- Backend server running on port 5001 with `/api/health` and `POST /api/documents/upload`.
- Document upload storage active in `server/uploads/`.

### Existing Architecture
- Express API server with `server.js`, `app.js`, `healthRoutes.js`, `documentRoutes.js`, `uploadMiddleware.js`, `documentService.js`.

### DOCX Library Selected
- **`adm-zip`** (`^0.5.12`) + **`fast-xml-parser`** (`^4.3.6`) for direct in-memory OpenXML archive extraction and XML node tree traversal.

### Why This Library Was Selected
1. **100% Structural Precision**: Direct access to OpenXML tags (`w:p`, `w:tbl`, `w:tr`, `w:tc`, `w:r`, `w:t`, `w:hdr`, `w:ftr`) enables exact tracking of table indices (`tableIndex`, `rowIndex`, `cellIndex`) and paragraph indices (`paragraphIndex`).
2. **Speed & Scalability**: In-memory ZIP buffer reading parses a 1.84 MB (127-page) DOCX in ~1.6 seconds without external binary or CLI tool dependencies.
3. **Downstream Redaction Compatibility**: OpenXML node locations map directly to downstream text replacement targets.

### Alternatives Considered
- `mammoth`: Excellent for HTML rendering, but abstracts away exact table grid coordinate metadata (`rowIndex`, `cellIndex`) necessary for precise downstream PII location and replacement.
- `docx`: Designed primarily for document generation rather than parsing existing complex 100+ page OpenXML archives.

### Parser Architecture
```
documentController.parseDocument
       │
       ▼
documentService.parseDocument
       │
       ▼
docxParserService.parseDocument
 ├── adm-zip (reads word/document.xml, header*.xml, footer*.xml in-memory)
 ├── fast-xml-parser (parses OpenXML node tree)
 ├── Paragraph Visitor (extracts <w:p> text runs)
 ├── Table Visitor (extracts <w:tbl> -> <w:tr> -> <w:tc> text runs)
 └── Header/Footer Visitor (extracts <w:hdr> / <w:ftr> text runs)
```

### Internal Document Model
```json
{
  "documentId": "doc_1786610773318_bf22713f8924",
  "sourceFile": {
    "originalName": "Red Herring Prospectus.docx",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": 1844676
  },
  "metrics": {
    "paragraphCount": 1006,
    "tableCount": 76,
    "tableCellCount": 3225,
    "textUnitCount": 4535,
    "totalCharacterCount": 321112,
    "emptyUnitCount": 1023,
    "headerCount": 75,
    "footerCount": 74
  },
  "content": [
    {
      "id": "unit-00025",
      "type": "paragraph",
      "text": "Our Company was originally incorporated...",
      "normalizedText": "Our Company was originally incorporated...",
      "location": { "paragraphIndex": 24 }
    },
    {
      "id": "unit-00030",
      "type": "table-cell",
      "text": "E-mail: cs.connect@kshinternational.com; Website: www.kshinternational.com",
      "normalizedText": "E-mail: cs.connect@kshinternational.com; Website: www.kshinternational.com",
      "location": { "tableIndex": 0, "rowIndex": 2, "cellIndex": 3, "paragraphIndex": 0 }
    }
  ]
}
```

### Paragraph Extraction
- Traverses top-level `<w:p>` nodes in `word/document.xml`.
- Extracts concatenated text runs `<w:t>`.
- Assigns location `{ paragraphIndex: P_INDEX }`.

### Table Extraction
- Traverses `<w:tbl>` nodes in `word/document.xml`.
- Iterates over rows `<w:tr>` and cells `<w:tc>`.
- Assigns location `{ tableIndex: T_INDEX, rowIndex: R_INDEX, cellIndex: C_INDEX, paragraphIndex: P_INDEX }`.

### Header/Footer Handling
- Reads `word/header1.xml` ... `word/headerN.xml` and `word/footer1.xml` ... `word/footerN.xml` from OpenXML archive.
- Assigns `type: "header"` or `type: "footer"` with `{ headerId / footerId, paragraphIndex }`.

### Normalization Decisions
- **`text`**: Preserves raw, original text string intact for exact downstream replacement.
- **`normalizedText`**: Collapses consecutive whitespace characters (`\s+` -> `' '`) and trims leading/trailing spaces for clean searching.
- **No Aggressive Lowercasing or Symbol Stripping**: Punctuation, symbols (`@`, `+`, `-`), and case are strictly preserved.

### Security Decisions
- Read-only parser operation. Source files on disk are never modified or overwritten.
- Full document body text is NOT dumped to console or API responses (API returns metrics and 10-unit safe preview with truncated snippets).

### Actual Assignment Document Tests & Parser Results
- **Document Tested**: `/Users/yuvraj/Downloads/Red Herring Prospectus.docx`
- **File Size**: 1,844,676 bytes (1.84 MB)
- **Page Count**: 127 pages DOCX
- **Measured Parse Metrics**:
  - `paragraphCount`: 1,006
  - `tableCount`: 76
  - `tableCellCount`: 3,225
  - `textUnitCount`: 4,535
  - `totalCharacterCount`: 321,112 characters
  - `headerCount`: 75
  - `footerCount`: 74
  - `parseDuration`: ~1.6 seconds

### Representative Search Verification (Non-PII Detection Verification)
- **Person Name Text**: Found in `unit-00759` (*"Contact person: Lokesh Shah/ Soumavo Sarkar..."*).
- **Email Text**: Found in `unit-00030` (*"E-mail: cs.connect@kshinternational.com; Website: www.kshinternational.com"*).
- **Telephone Text**: Found in `unit-00029` (*"Contact Person: Sarthak Malvadkar, Company Secretary..."*).
- **Company Name Text**: Found in `unit-00012` (*"KSH INTERNATIONAL LIMITED CORPORATE IDENTITY NUMBER: U28129PN1979PLC141032"*).
- **Address Text**: Found in `unit-00025` (*"Our Company was originally incorporated as “Bhandary Metal Extrusion P..."*).

### Tests Performed
Executed automated runner `test_execution_003.js` covering 13 test points:
1. `DocxParserService` module loading.
2. Actual RHP upload via API.
3. API document parsing (`POST /api/documents/:documentId/parse`).
4. Paragraph count threshold check (> 500 paragraphs).
5. Table & cell count threshold check (> 10 tables, > 100 cells).
6. Person name text search.
7. Email text search.
8. Telephone text search.
9. Company name text search.
10. Address text search.
11. Non-existent document ID 404 error handling.
12. Read-only source file integrity check (mtime and size comparison).
13. Health API regression check.

### Test Results
- **All 13 Test Cases**: **PASSED** (0 failures).
- **Frontend Build (`npx vite build`)**: **PASSED** (1.09s).

### Problems Encountered
- `errorHandler.js` operator precedence issue caused 404 error objects to return status 200. Fixed parenthesis ordering in `errorHandler.js`.

### Tradeoffs
- Decoupled parser from persistence models; full structured document content stored in-memory during parse operations.

### Known Limitations
- PII detection engine, regex patterns, and entity tagging are intentionally excluded per Execution 003 scope.

### Current System State
- Fully operational MERN stack with DOCX upload and OpenXML structural document parser.
- Endpoint `POST /api/documents/:documentId/parse` active.
- Parser capable of processing 127-page Red Herring Prospectus in ~1.6s.

### Next Recommended Step
Proceed to **EXECUTION 004 — PII DETECTION ENGINE**:
1. Implement entity detection service (`server/src/services/piiDetectorService.js`).
2. Implement pattern matchers for the 9 required categories (Full Names, Emails, Phones, Company Names, Addresses, SSNs, Credit Cards, Dates of Birth, IP Addresses).
3. Bind detector to structured text units from `docxParserService`.
