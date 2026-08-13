# PII Redaction Tool — Production Systems Documentation

A comprehensive, local-first enterprise solution built on the **MERN** stack (**JavaScript ONLY**) for ingesting Microsoft Word documents (`.docx`), parsing OpenXML structure, detecting sensitive Personally Identifiable Information (PII) across 9 distinct categories, generating deterministic synthetic replacements, performing in-place DOCX redaction, scanning post-redaction files for residual leakage, and executing reproducible formal evaluation runs.

---

## 1. Overview

The **PII Redaction Tool** is designed for automated data privacy compliance in legal, financial, and corporate documentation. It accepts `.docx` files, extracts paragraphs, table cells, headers, and footers into structured text units, detects 9 PII entity types using hybrid deterministic regex/Luhn algorithms and contextual NLP strategies, replaces original PII with realistic synthetic alternatives, and emits redacted `.docx` files while preserving structural document integrity.

- **Primary Input**: Microsoft Word Document (`.docx`)
- **Primary Output**: Redacted Microsoft Word Document (`<documentId>_redacted.docx`)
- **Execution Mode**: 100% Server-side local processing (Zero external cloud API transmission)
- **Supported PII Categories**: 9 Entity Types (**PERSON**, **EMAIL**, **PHONE**, **ORGANIZATION**, **ADDRESS**, **DOB**, **SSN**, **CREDIT_CARD**, **IP_ADDRESS**)

---

## 2. Problem Statement

Corporate prospectuses, legal contracts, and financial filings often contain confidential PII (such as executive names, phone numbers, email addresses, corporate entities, and financial account identifiers). Manual redaction is error-prone, labor-intensive, and risks accidental leakage. 

The goal of this system is to:
1. Accept an unredacted DOCX document containing sensitive PII.
2. Parse text units across all OpenXML structures (paragraphs, tables, headers, footers).
3. Identify and isolate all PII instances across 9 mandatory categories.
4. Replace PII instances with deterministic, context-consistent synthetic replacements.
5. Generate a sanitized DOCX output file while guaranteeing original source file immutability.
6. Verify output safety using an independent post-redaction PII leakage scanner.
7. Evaluate detection performance using a formal precision/recall evaluation engine.

---

## 3. Supported PII Types

| PII Category | Description | Detection Approach | Validation Rules |
| :--- | :--- | :--- | :--- |
| **PERSON** | Full human names | Local NLP compromise parsing + Honorifics/Roles context | Section heading suppression + non-person keyword filters |
| **EMAIL** | Email addresses | RFC 5322 pattern matching | Domain structure validation + URL filter (`!/^www\./`) |
| **PHONE** | Telephone numbers | Indian (+91) & international regex patterns | Mandatory country code prefix OR surrounding phone context keywords |
| **ORGANIZATION** | Corporate & company names | Corporate suffix matching + NLP entity extraction | Unicode quotation mark trimming (`“`, `”`) + regulatory allowlists |
| **ADDRESS** | Mailing & physical addresses | Indian street, building, city, state, & PIN code context | Multi-token context window scoring |
| **DOB** | Dates of birth | Date pattern matching in birth-specific context | Surrounding date keywords (`DOB:`, `born on`) |
| **SSN** | Social Security Numbers | Standard 9-digit SSN format (`\b\d{3}-\d{2}-\d{4}\b`) | Structural delimiter validation |
| **CREDIT_CARD** | 16-digit credit card numbers | 16-digit numeric sequence matching | **Luhn Algorithm Checksum Validation** |
| **IP_ADDRESS** | IPv4 address strings | Dotted-decimal pattern matching | IPv4 octet bounds validation (`0-255` per octet) |

---

## 4. Technology Stack

- **Core**: MERN Stack Architecture (**JavaScript ONLY**; strict zero TypeScript boundary).
- **Frontend**: React.js, Vite, Vanilla CSS design system.
- **Backend**: Node.js, Express.js REST API.
- **Database**: MongoDB (Redaction job metadata & audit logs).
- **DOCX Processing**: `fast-xml-parser` (OpenXML XML tree parsing & building), `adm-zip` (DOCX ZIP archive extraction & compression).
- **Local NLP / Matching**: `compromise` (Local named entity candidate extraction).
- **Testing**: Node.js core assertion suite (`assert`).

---

## 5. Architecture

```
User Browser (React UI)
       │
       │ HTTP POST /api/documents/upload
       ▼
Express API Gateway
       │
       ├── Document Ingestion Engine (documentService.js)
       ├── OpenXML DOCX Structural Parser (docxParserService.js)
       ├── 9 PII Detectors (server/src/detectors/)
       ├── Post-Candidate Pipeline (piiValidationService.js, piiNormalizationService.js)
       ├── Synthetic Replacement Mapping (replacementService.js)
       ├── OpenXML DOCX Redaction Engine (docxRedactionService.js)
       ├── Post-Redaction PII Leakage Scanner (leakageScanner.js)
       └── Formal Evaluation Engine (evaluatorService.js)
```

---

## 6. Processing Workflow

```
DOCX Input ──► Parser ──► 9 PII Detectors ──► Validation & Allowlist ──► Normalization
    │
    ▼
Replacement Mapping Plan ──► OpenXML Redaction Engine ──► Redacted DOCX Output
                                                               │
                                                               ▼
Formal Evaluation Engine ◄── Post-Redaction Leakage Scan ◄─────┘
```

1. **DOCX Ingestion**: File validated (`.docx` extension, MIME type, size < 25MB), stored safely, and assigned a unique document ID (`doc_...`).
2. **OpenXML Structural Parsing**: Unzips DOCX archive, parses `word/document.xml`, `header*.xml`, `footer*.xml`, extracts paragraphs and table cells into text units with stable IDs (`unit-00001`).
3. **PII Detection**: Runs 5 deterministic detectors + 4 contextual/NLP detectors in parallel.
4. **Validation & Normalization**: Enforces strict offset invariants (`unit.text.substring(start, end) === entity.text`), trims quotation marks, and checks regulatory allowlists.
5. **Synthetic Replacement Mapping**: Maps PII entities to realistic synthetic alternatives while maintaining 1-to-1 consistency for repeated occurrences.
6. **OpenXML DOCX Redaction**: Replaces target text spans in-place from end-to-beginning across XML runs (`<w:r>`).
7. **Post-Redaction Leakage Scanning**: Reparses redacted DOCX independently and scans for residual original PII strings or newly introduced leaks.
8. **Formal Evaluation Engine**: Computes exact span metrics and character mask projections against gold annotations.

---

## 7. Detection Approach

The detection engine combines two complementary strategies:

### 1. Deterministic & Structural Detectors
- **EMAIL**: Regex matching RFC 5322 standards. Rejects website domains lacking `@` mailbox prefixes (`www.sebi.gov.in`).
- **PHONE**: Matches international formats (`+91 22 6807 7100`). Enforces surrounding phone context keywords for unformatted 10-digit numbers to reject financial table figures.
- **CREDIT_CARD**: Matches 16-digit numeric sequences and validates via the **Luhn Algorithm Checksum**.
- **SSN**: Matches standard 9-digit SSN patterns with boundary checks.
- **IP_ADDRESS**: Matches IPv4 dotted-decimal strings and validates each octet is between `0` and `255`.

### 2. Contextual & NLP Detectors
- **PERSON**: Uses local NLP candidate extraction combined with honorifics (`Mr.`, `Ms.`, `Dr.`), executive role keywords (`Officer`, `Director`), and section heading suppression (`BOARD OF DIRECTORS`).
- **ORGANIZATION**: Matches corporate suffixes (`Private Limited`, `Limited`, `LLP`, `Inc.`), strips surrounding unicode quotes (`“`, `”`), and checks regulatory allowlists.
- **ADDRESS**: Evaluates multi-token context windows containing Indian building terms, street keywords, city/state lists, and 6-digit PIN codes.
- **DOB**: Matches date formats in birth-specific context windows (`born on`, `Date of Birth:`).

---

## 8. Why Multiple Detection Strategies

No single detection method reliably covers all PII entity types:
- **Deterministic Regex/Luhn** is fast, 100% reproducible, and high-precision for structured formats (Emails, SSNs, Credit Cards, IPs, Phone Numbers). However, regex fails on context-dependent entities like human names or corporate entities.
- **Contextual NLP & Rule-Based Heuristics** handle variable-length names and organizations by leveraging surrounding sentence context, title honorifics, and corporate suffixes. Combining both strategies maximizes recall while suppressing false positive noise in legal/financial tables.

---

## 9. Replacement Strategy

Original PII entities are mapped to realistic synthetic replacements using deterministic hash-based lookup:
- **Canonical Consistency**: The exact same original PII entity occurrence always maps to the same synthetic replacement throughout the document.
- **Example Mapping**:
  - `Sarthak Malvadkar` (Original Person) -> `Arjun Mehta` (Synthetic Replacement)
  - `Sarthak Malvadkar` (Repeated Occurrence) -> `Arjun Mehta` (Synthetic Replacement)
  - `cs.connect@kshinternational.com` (Original Email) -> `support.desk@synorg.com` (Synthetic Email)

---

## 10. DOCX Redaction

- **Source Immutability**: Source DOCX file is NEVER modified or overwritten.
- **In-Place OpenXML Substitution**: Modifies OpenXML XML text nodes (`<w:t>`) inside `<w:r>` runs across paragraphs, table cells, headers, and footers.
- **Right-to-Left / Descending Offset Ordering**: Replacements are applied in descending order of character start offsets per text unit to prevent character position shifting.
- **Table Preservation**: Preserves OpenXML table structures (`<w:tbl>`, `<w:tr>`, `<w:tc>`) with zero cell corruption.

---

## 11. Post-Redaction Leakage Scan

The Post-Redaction PII Leakage Scanner independently verifies safety:
1. Unzips and reparses generated `<docId>_redacted.docx`.
2. Runs all 9 PII detectors on reparsed text units.
3. Executes direct substring search for unredacted original PII strings.
4. Classifies findings into 4 categories:
   - **CONFIRMED_LEAK**: Original PII string found unredacted in output (Triggers FAIL).
   - **NEW_UNINTENDED_PII**: Potential residual PII.
   - **EXPECTED_SYNTHETIC_ENTITY**: Detector detected a synthetic replacement entity (Valid PASS).
   - **SCANNER_FALSE_POSITIVE**: Scanner FP on generic text.
5. Verifies structural integrity (Original vs Redacted paragraph and table counts).

---

## 12. Evaluation Methodology

Formal evaluation compares model predictions against ground-truth gold annotations:
- **Exact Span Match (`TP`)**: Same text unit ID (`unitId`) + same start offset + same end offset + same PII type.
- **False Positive (`FP`)**: Prediction emitted by model not present in gold annotations.
- **False Negative (`FN`)**: Gold annotation missed by model predictions.
- **Partial Match**: Overlapping span boundaries with mismatching start/end offsets.
- **Wrong Type**: Matching span boundaries with mismatching PII entity type.

---

## 13. Metrics

- **Entity Precision**: $\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}$
- **Entity Recall**: $\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}$
- **Entity F1-Score**: $\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$
- **Character-Level Accuracy**: $\text{Accuracy}_{\text{char}} = \frac{\text{TP}_{\text{char}} + \text{TN}_{\text{char}}}{\text{TP}_{\text{char}} + \text{TN}_{\text{char}} + \text{FP}_{\text{char}} + \text{FN}_{\text{char}}}$

---

## 14. Evaluation Scope

> [!IMPORTANT]
> **PARTIAL DATASET EVALUATION**: The reported evaluation metrics represent performance evaluated against the validated gold-covered subset of 8 ground-truth annotations in `Red Herring Prospectus.docx` (4,535 text units). These metrics represent the validated gold-covered subset and should not be presented as document-wide performance.

---

## 15. Final Empirical Results (Execution 015 Benchmark)

### Overall Entity & Character Metrics

| Metric | Result |
| :--- | :---: |
| **Evaluated Gold Annotations (`TP + FN`)** | 8 / 8 |
| **True Positives (`TP`)** | 8 |
| **False Positives (`FP`)** | 1,600 |
| **False Negatives (`FN`)** | **0** |
| **Entity Micro Recall** | **100.0%** |
| **Entity Micro Precision** | 0.50% |
| **Entity Micro F1-Score** | 0.0099 |
| **Character-Level Recall** | **100.0%** |
| **Character-Level Accuracy** | **90.55%** |

### Per-Type Metrics Breakdown

| PII Type | Gold Count | Predictions | TP | FP | FN | Precision | Recall | F1 | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **PERSON** | 1 | 1,050 | 1 | 1,049 | 0 | 0.10% | **100.0%** | 0.0019 | EVALUATED |
| **EMAIL** | 3 | 52 | 3 | 49 | 0 | 5.77% | **100.0%** | 0.1091 | EVALUATED |
| **PHONE** | 1 | 12 | 1 | 11 | 0 | 8.33% | **100.0%** | 0.1538 | EVALUATED |
| **ORGANIZATION** | 3 | 481 | 3 | 478 | 0 | 0.62% | **100.0%** | 0.0124 | EVALUATED |
| **ADDRESS** | 0 | 13 | 0 | 13 | 0 | 0.00% | N/A | N/A | EVALUATED |
| **DOB** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |
| **SSN** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |
| **CREDIT_CARD** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |
| **IP_ADDRESS** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | NO_GOLD_OCCURRENCES |

---

## 16. Baseline vs Final Comparison

| Evaluation Metric | Baseline (Execution 013) | Final (Execution 015) | Absolute Change | Impact |
| :--- | :---: | :---: | :---: | :--- |
| **True Positives (`TP`)** | 5 | **8** | **+3** | Improved |
| **False Positives (`FP`)** | 2,009 | **1,600** | **-409** | Improved (-409 FPs) |
| **False Negatives (`FN`)** | 3 | **0** | **-3** | Eliminated (0 FNs) |
| **Entity Micro Recall** | 62.50% | **100.00%** | **+37.50%** | **100.0% Recall** |
| **Entity Micro Precision** | 0.25% | **0.50%** | **+0.25%** | Doubled |
| **Character-Level Recall** | 79.84% | **100.00%** | **+20.16%** | **100.0% Recall** |

---

## 17. False Positives Analysis

- **Section Titles**: Capitalized multi-word headings (`BOARD OF DIRECTORS`, `REGISTERED OFFICE`) matched capitalization NLP rules (Mitigated via header suppression).
- **Corporate Suffixes in General Prose**: Mentions of generic industry sectors containing `Limited` or `Private` triggered organization candidates.
- **Financial Table Figures**: 10-digit numeric table sequences matching phone regex patterns (Mitigated via phone context keyword check).

---

## 18. False Negatives Analysis

- **Baseline FNs (Execution 013)**: 3 organization names enclosed in unicode quotation marks (`“Bhandary Metal Extrusion Private Limited”`, `“KSH International Private Limited”`, `“KSH International Limited”`) were missed due to offset shifts.
- **Final FNs (Execution 015)**: **0 False Negatives** across all evaluated gold annotations (Quote-trimming fix eliminated all 3 FNs).

---

## 19. System Tradeoffs

- **Recall vs Precision**: The detector prioritizes **100% Recall** (zero PII leakage) over precision, accepting false positive candidate noise rather than risking unredacted PII leaks in sensitive documents.
- **Local CPU Processing vs Cloud Accuracy**: Uses local JavaScript NLP processing (`compromise`) to guarantee data privacy, trading off heavy cloud Transformer models (e.g. SpaCy / BERT).

---

## 20. Security Considerations

- **Local Storage Isolation**: Files stored in local `server/uploads/` directory; git-ignored.
- **Zero Cloud Leakage**: No document text sent to external APIs or third-party web services.
- **Safe Masking**: Log files and evaluation artifacts output masked PII strings (`S****** M********`).
- **Source File Immutability**: Source files are read-only; SHA-256 hash verified identical BEFORE === AFTER execution.

---

## 21. Project Structure

```
PII-Redaction-tool-Scaler-Ai-labs-/
 ├── client/                         # React Frontend Application
 │    ├── src/
 │    │    ├── components/           # Upload & Dashboard UI Components
 │    │    └── App.jsx
 │    └── package.json
 ├── server/                         # Express Backend REST API
 │    ├── src/
 │    │    ├── config/               # Upload & Version Configuration (versionConfig.js)
 │    │    ├── detectors/            # 9 PII Entity Detector Modules
 │    │    ├── evaluation/           # Formal Evaluation Engine & Report Generators
 │    │    │    ├── data/            # Gold Annotation Datasets (prospectus_gold_dataset.json)
 │    │    │    ├── engine/          # evaluationEngine.js & metricsCalculator.js
 │    │    │    ├── reports/         # final-evaluation-result.json, final-vs-baseline-evaluation.md
 │    │    │    └── services/        # evaluatorService.js
 │    │    ├── leakage/              # Post-Redaction Leakage Scanner Subsystem
 │    │    ├── replacement/          # Synthetic Replacement Generators & Registry
 │    │    └── services/             # docxParserService.js, docxRedactionService.js
 │    ├── tests/                     # Automated Test Suites (test_execution_010.js - test_execution_015.js)
 │    └── server.js
 ├── README.md                       # Comprehensive Assignment Readme
 ├── evaluation-report.md            # Detailed Evaluation Report
 ├── assignment-compliance-checklist.md
 ├── submission-manifest.md
 ├── flow.md                         # Detailed System Operational Flows
 └── context.md                      # Engineering Execution Logs
```

---

## 22. Installation & Setup

### Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+)

### Installation Commands
```bash
# Clone the repository
git clone https://github.com/Yuvraj264/PII-Redaction-tool-Scaler-Ai-labs-.git
cd PII-Redaction-tool-Scaler-Ai-labs-

# Install Backend Dependencies
cd server
npm install

# Install Frontend Dependencies
cd ../client
npm install
```

---

## 23. Environment Variables

Create `server/.env` (Optional defaults provided in `server/src/config/uploadConfig.js`):
```env
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE_MB=25
UPLOAD_DIR=uploads
```

---

## 24. Running the Application

### Development Mode (Backend + Frontend)

```bash
# Terminal 1: Start Express Backend API (Port 5000)
cd server
npm run dev

# Terminal 2: Start React Frontend UI (Port 5173)
cd client
npm run dev
```

Open browser at `http://localhost:5173`.

---

## 25. Reproducing Evaluation Runs

Execute automated final evaluation test runner:
```bash
cd server
node tests/test_execution_015.js
```

To run all repository test suites (Executions 010, 012, 013, 014, 015):
```bash
node tests/test_execution_015.js && node tests/test_execution_014.js && node tests/test_execution_013.js && node tests/test_execution_012.js && node tests/test_execution_010.js
```

---

## 26. Redacted Output Location

Redacted DOCX files are generated at:
`server/uploads/<documentId>_redacted.docx`

Example: `server/uploads/doc_1786622697521_f7e04c92f688_redacted.docx`

---

## 27. System Limitations

1. **Partial Gold Dataset Coverage**: Evaluation metrics are calculated against the validated gold-covered subset of 8 ground-truth annotations in `Red Herring Prospectus.docx`.
2. **False Positive Noise**: Highly aggressive NLP entity extraction produces candidate false positives on corporate legal headings.
3. **Format Support**: Supports Microsoft Word `.docx` (OpenXML) format; `.doc` binary or PDF formats are not supported in the current version.

---

## 28. Future Enhancements

1. **Transformer-Based Local NER**: Integrate lightweight ONNX runtime transformer models (e.g. MobileBERT) for higher name precision.
2. **Interactive UI Review Dashboard**: Enable manual entity confirmation/rejection in the React UI before generating redacted DOCX files.
3. **Multi-Format Parsing**: Expand parser support to PDF, Plain Text, and OpenDocument Text (`.odt`).
