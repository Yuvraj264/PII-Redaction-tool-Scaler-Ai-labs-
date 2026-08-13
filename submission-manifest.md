# Submission Manifest — PII Redaction Tool

Complete inventory of all project source files, evaluation reports, configuration settings, test suites, and deliverable artifacts.

---

## 1. Primary Assignment Deliverables

| Deliverable Item | File Location | Purpose | Status |
| :--- | :--- | :--- | :---: |
| **Deliverable 1: Source Code** | `server/src/`, `client/src/` | Complete MERN stack application source code (Node.js, Express, React, JavaScript ONLY) | **COMPLETE** |
| **Deliverable 2: Redacted DOCX** | `server/uploads/doc_1786622697521_f7e04c92f688_redacted.docx` | Sanitized OpenXML DOCX output with synthetic replacements | **COMPLETE** |
| **Deliverable 3: README Document** | [README.md](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/README.md) | Assignment-facing system documentation | **COMPLETE** |
| **Deliverable 4: Evaluation Report** | [evaluation-report.md](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/evaluation-report.md) | Formal PII evaluation report & baseline comparison | **COMPLETE** |

---

## 2. Evaluation & Benchmark Artifacts

| Artifact Name | File Path | Purpose | Status |
| :--- | :--- | :--- | :---: |
| **Machine-Readable Final Result** | `server/src/evaluation/reports/final-evaluation-result.json` | Final machine-readable evaluation result JSON payload | **GENERATED** |
| **Final vs Baseline Comparison** | `server/src/evaluation/reports/final-vs-baseline-evaluation.md` | Markdown baseline comparison artifact | **GENERATED** |
| **Verified Engineering Facts** | `server/src/evaluation/reports/readme-facts.md` | Verified facts compiler artifact | **GENERATED** |
| **Baseline Evaluation Result** | `server/src/evaluation/reports/baseline-evaluation-result.json` | Baseline evaluation run JSON artifact | **PRESERVED** |
| **Baseline Evaluation Report** | `server/src/evaluation/reports/baseline-evaluation-report.md` | Baseline error analysis report | **PRESERVED** |
| **Gold Annotation Dataset** | `server/src/evaluation/data/prospectus_gold_dataset.json` | Ground-truth annotation dataset for Red Herring Prospectus.docx | **VERIFIED** |
| **Compliance Checklist** | [assignment-compliance-checklist.md](file:///Users/yuvraj/Desktop/projects/scaler%20ai%20labs%20Pii%20engine%20/assignment-compliance-checklist.md) | 13-point compliance audit checklist | **COMPLETE** |

---

## 3. Core Source Code Components

| Component | Key Files | Description |
| :--- | :--- | :--- |
| **Server Shell** | `server/server.js`, `server/src/app.js` | Express REST API server bootstrap & health check endpoints |
| **Version Configuration** | `server/src/config/versionConfig.js` | Frozen detector version identifier (`1.0.0-final`) |
| **DOCX Structural Parser** | `server/src/services/docxParserService.js` | OpenXML XML tree extraction for paragraphs, tables, headers, and footers |
| **9 PII Detectors** | `server/src/detectors/*.js` | Email, Phone, IP, SSN, Credit Card, Person, Organization, Address, DOB detectors |
| **Validation & Allowlist** | `server/src/services/piiValidationService.js`, `allowlistService.js` | Character offset invariant enforcement & allowlist filtering |
| **Synthetic Replacement** | `server/src/replacement/*.js` | Deterministic 1-to-1 synthetic replacement mapping & generator modules |
| **DOCX Redaction Engine** | `server/src/services/docxRedactionService.js` | In-place OpenXML run substitution engine |
| **Post-Redaction Scanner** | `server/src/leakage/*.js` | Independent post-redaction PII leakage scanner subsystem |
| **Formal Evaluator** | `server/src/evaluation/engine/evaluationEngine.js`, `metricsCalculator.js` | Span matching engine & entity/character metrics calculator |
| **React Frontend UI** | `client/src/App.jsx`, `components/DocumentUploadPlaceholder.jsx` | Drag & drop file upload and processing UI |

---

## 4. Test Suite Inventory

| Test Suite | Command | Purpose | Status |
| :--- | :--- | :--- | :---: |
| **Execution 016 Test Runner** | `node server/tests/test_execution_016.js` | Documentation consistency & verification test suite | **PASS** (10/10) |
| **Execution 015 Test Runner** | `node server/tests/test_execution_015.js` | Final frozen evaluation & baseline comparison test suite | **PASS** (12/12) |
| **Execution 014 Test Runner** | `node server/tests/test_execution_014.js` | Controlled detector improvement regression suite | **PASS** (11/11) |
| **Execution 013 Test Runner** | `node server/tests/test_execution_013.js` | Baseline evaluation run & error analysis suite | **PASS** (10/10) |
| **Execution 012 Test Runner** | `node server/tests/test_execution_012.js` | Formal evaluation engine & synthetic test suite | **PASS** (11/11) |
| **Execution 010 Test Runner** | `node server/tests/test_execution_010.js` | Post-redaction leakage scanner integration suite | **PASS** (12/12) |
| **Frontend Vite Build** | `npx vite build` | Client bundle compilation test | **PASS** (589ms) |
