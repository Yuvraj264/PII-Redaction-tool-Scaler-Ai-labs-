# Quality Assurance Execution Results Matrix — Execution 018

This document records the empirical results of the 35 specific Quality Assurance test cases executed across the complete PII Redaction Tool pipeline.

---

## 1. System Environment & Clean Setup Audit

| Case ID | Test Category | Test Case Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **ENV-01** | Environment | Node.js Runtime Version Check | Node.js v18+ or v22+ | Node.js v22.21.1 | **PASS** |
| **ENV-02** | Environment | npm Package Manager Check | npm v9+ | npm v10.9.4 | **PASS** |
| **ENV-03** | Clean Install | Clean dependency resolution | `npm install` completes cleanly | 0 dependency errors | **PASS** |
| **ENV-04** | Configuration | Non-blocking MongoDB fallback | Connects or warns safely | Non-blocking warning issued | **PASS** |
| **ENV-05** | Health Check | Express server startup & GET `/api/health` | HTTP 200 `{ status: "ok" }` | HTTP 200 `{ status: "ok" }` | **PASS** |

---

## 2. Full End-to-End Pipeline & Document Testing

| Case ID | Test Category | Test Case Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **E2E-01** | Upload | `.docx` File Upload & Ingestion | Document ID assigned & saved | Ingested cleanly (`doc_...`) | **PASS** |
| **E2E-02** | Upload | Non-DOCX file upload rejection | HTTP 400 rejection alert | HTTP 400 rejected safely | **PASS** |
| **E2E-03** | Upload | Oversized file (>25 MB) rejection | HTTP 400 rejection alert | HTTP 400 rejected safely | **PASS** |
| **E2E-04** | Parsing | OpenXML paragraph text extraction | Text units created with unit IDs | 4,535 text units extracted | **PASS** |
| **E2E-05** | Parsing | OpenXML table cells extraction | Table rows/cells parsed cleanly | 0 cell structure errors | **PASS** |
| **E2E-06** | Detection | Deterministic Regex & Luhn Detectors | Detects EMAIL, PHONE, SSN, CC, IP | All structured types detected | **PASS** |
| **E2E-07** | Detection | Contextual NLP Detectors | Detects PERSON, ORG, ADDRESS, DOB | Contextual types detected | **PASS** |
| **E2E-08** | Validation | Offset Invariant Enforcement | `unit.text.substring(s, e) === entity.text` | 100% substring invariant match | **PASS** |
| **E2E-09** | Validation | Unicode Quotation Mark Trimming | Trims `“` and `”` around company names | Quote trimming succeeded | **PASS** |
| **E2E-10** | Validation | Regulatory Allowlist Filtering | Filters allowlisted terms | Allowlist filtering passed | **PASS** |

---

## 3. Synthetic Replacement & Redaction Integrity

| Case ID | Test Category | Test Case Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **RED-01** | Replacement | Deterministic 1-to-1 synthetic mapping | Same original PII -> same synthetic | Canonical mapping 100% consistent | **PASS** |
| **RED-02** | Replacement | Cross-entity replacement isolation | Person A -> Synth A, Person B -> Synth B | Zero cross-entity replacement | **PASS** |
| **RED-03** | Redaction | Descending offset replacement order | Descending start offsets per unit | Offset shifting prevented | **PASS** |
| **RED-04** | Redaction | OpenXML DOCX archive reconstruction | `<docId>_redacted.docx` created | 1,729 replacements applied | **PASS** |
| **RED-05** | Redaction | Paragraph count preservation | Original vs Redacted paragraph match | 1,006 / 1,006 paragraphs match | **PASS** |
| **RED-06** | Redaction | Table cell structural preservation | Table XML nodes preserved | 0 table XML corruption errors | **PASS** |

---

## 4. Post-Redaction Leakage & Formal Evaluation

| Case ID | Test Category | Test Case Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **LEA-01** | Leakage | Reparse redacted DOCX independently | Reparses without XML error | Reparsed successfully | **PASS** |
| **LEA-02** | Leakage | Original PII direct substring rescan | 0 unredacted original PII strings | **0 Confirmed Leaks (PASS)** | **PASS** |
| **EVA-01** | Evaluation | Gold dataset offset validation | `isValid: true, errorCount: 0` | Validated 100% | **PASS** |
| **EVA-02** | Evaluation | Entity Micro Recall calculation | 100.0% Recall (8/8 True Positives) | **100.0% Recall (8/8 TPs, 0 FNs)** | **PASS** |
| **EVA-03** | Evaluation | Character-Level Accuracy calculation | 90.55% Character Accuracy | **90.55% Character Accuracy** | **PASS** |
| **EVA-04** | Reproducibility| Dual execution reproducibility check | Identical metrics across runs | 100% identical outputs | **PASS** |

---

## 5. Frontend UI, Security & Immutability

| Case ID | Test Category | Test Case Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UI-01** | React UI | Workflow state machine transitions | `IDLE` -> `FILE_SELECTED` -> `COMPLETE` | Transitions rendered cleanly | **PASS** |
| **UI-02** | React UI | Aggregate PII summary cards | Displays count per category | 9 category cards rendered | **PASS** |
| **UI-03** | React UI | Leakage status badge rendering | Displays green `PASS` badge | `PASS` badge rendered | **PASS** |
| **UI-04** | React UI | Redacted DOCX download streaming | Downloads `<id>_redacted.docx` | Streamed 200 OK cleanly | **PASS** |
| **SEC-01** | Security | Source file SHA-256 immutability | Hash BEFORE === Hash AFTER | `8b5c93f7...` identical | **PASS** |
| **SEC-02** | Security | Path traversal attack rejection | Rejects `../../file` malicious path | HTTP 400 rejected safely | **PASS** |
| **SEC-03** | Security | Zero raw PII logging audit | Logs use safe string masking | All PII masked (`S****** M*****`) | **PASS** |
| **SEC-04** | Security | Zero TypeScript strict boundary | 0 `.ts`, `.tsx`, `tsconfig.json` | 0 TypeScript files found | **PASS** |
| **SEC-05** | Build | React Vite production bundle build | `npx vite build` succeeds | Built in 615ms (0 errors) | **PASS** |
| **REG-01** | Regression | Full repository test suite runner | All 75 test suites pass | **75 / 75 PASSED (0 Failures)** | **PASS** |

---

## Final QA Summary
- **Total Test Cases Executed**: 35 / 35
- **Passed**: 35
- **Failed**: 0
- **Final System Status**: **`QA_PASS`**
