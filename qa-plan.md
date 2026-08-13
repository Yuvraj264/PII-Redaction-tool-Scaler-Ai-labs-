# Quality Assurance Strategy & Test Plan — PII Redaction Tool

This document outlines the formal Quality Assurance (QA) strategy, test coverage areas, execution methodologies, and verification criteria for the **PII Redaction Tool**.

---

## 1. QA Objectives & Philosophy
The primary objective of this QA execution is to perform rigorous, end-to-end validation of the complete PII Redaction system from document ingestion to post-redaction leakage scanning and formal metric evaluation.

Key Principles:
- **Zero PII Leakage**: 100% verification that original sensitive PII strings do not remain in redacted DOCX files.
- **Source Immutability**: Original source DOCX files must remain 100% untouched and read-only.
- **Reproducibility**: Identical pipeline inputs must produce 100% identical detection and metric outputs.
- **Stack Boundary Preservation**: 100% pure JavaScript MERN stack with zero TypeScript dependencies.

---

## 2. Testing Areas & Strategy

### 2.1 Functional Testing
Validates that every workflow stage (Upload, Parse, Detect, Validate, Normalize, Replace, Redact, Verify, Evaluate, Download) functions as specified without runtime exceptions.

### 2.2 Integration Testing
Verifies HTTP API contract compatibility between the React frontend (`client/src/App.jsx`, `apiService.js`) and Express backend controllers (`documentController.js`, `evaluationController.js`).

### 2.3 Document & Structural Testing
Tests OpenXML DOCX parsing and redaction across complex document structures:
- Single and multi-paragraph text units.
- Table structures (`<w:tbl>`, `<w:tr>`, `<w:tc>`) with multi-column cells.
- Header (`header*.xml`) and footer (`footer*.xml`) text units.
- Entities split across multiple OpenXML XML runs (`<w:r>`).

### 2.4 Detection Testing
Validates detection capabilities across all 9 supported PII entity types (**PERSON**, **EMAIL**, **PHONE**, **ORGANIZATION**, **ADDRESS**, **DOB**, **SSN**, **CREDIT_CARD** with Luhn checksum, **IP_ADDRESS**).

### 2.5 Redaction Testing
Verifies in-place text substitution ordering (descending offset order per text unit) to prevent character position shifting during OpenXML manipulation.

### 2.6 Post-Redaction Leakage Scanning
Executes independent post-redaction safety audits using `leakageScanner.js` to classify findings into 4 distinct categories (**CONFIRMED_LEAK**, **POSSIBLE_LEAK**, **EXPECTED_SYNTHETIC_ENTITY**, **SCANNER_FALSE_POSITIVE**).

### 2.7 Formal Evaluation Engine Testing
Verifies span-level exact matching (`unitId` + `start` + `end` + `type`), character span mask projections, $10 \times 10$ type confusion matrix generation, and micro/macro precision, recall, and F1 calculations.

### 2.8 Frontend Testing
Validates the React UI workflow state machine (`IDLE` -> `FILE_SELECTED` -> `UPLOADING` -> `DETECTED` -> `REDACTED` -> `VERIFIED` -> `COMPLETE`), aggregate detection summary cards, verification cards, evaluation panel, download action, and error recovery.

### 2.9 Security & Privacy Hardening
- **Path Traversal Audit**: Rejects malicious file identifiers (`../../file`).
- **Zero Raw PII Logging**: Ensures console logs output safe masked PII strings (`S****** M********`).
- **Secrets Audit**: Confirms zero secret API keys or credentials exposed in frontend environment variables.

### 2.10 Performance & Memory Testing
Measures processing latency across parsing, detection, validation, redaction, leakage scanning, and evaluation for 100+ page documents (target < 15 seconds end-to-end).

### 2.11 Failure Recovery
Verifies safe UI error handling for invalid file formats, oversized files (> 25 MB), corrupted DOCX archives, network disconnects, and server exceptions.

### 2.12 Reproducibility
Ensures dual execution of final evaluation runs yields identical prediction counts and recall metrics.

---

## 3. Execution Matrix

| Test Suite ID | Description | Execution Tool | Target Result |
| :--- | :--- | :--- | :--- |
| **QA-EXEC-018** | End-to-End QA, Security & Pipeline Test | `node server/tests/test_execution_018.js` | 12/12 PASSED |
| **QA-EXEC-017** | Frontend & API Integration Test | `node server/tests/test_execution_017.js` | 10/10 PASSED |
| **QA-EXEC-016** | Documentation Consistency & Audit Test | `node server/tests/test_execution_016.js` | 10/10 PASSED |
| **QA-EXEC-015** | Final Frozen Evaluation & Baseline Test | `node server/tests/test_execution_015.js` | 12/12 PASSED |
| **QA-EXEC-014** | Controlled Detector Improvement Test | `node server/tests/test_execution_014.js` | 11/11 PASSED |
| **QA-EXEC-013** | Baseline Error Analysis Test | `node server/tests/test_execution_013.js` | 10/10 PASSED |
| **QA-EXEC-012** | Formal Evaluation Engine Test | `node server/tests/test_execution_012.js` | 11/11 PASSED |
| **QA-EXEC-010** | Leakage Scanner & Redaction Test | `node server/tests/test_execution_010.js` | 12/12 PASSED |
| **QA-BUILD** | Client Vite Production Build Test | `npx vite build` | Built in < 1s (0 Errors) |
