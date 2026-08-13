# Defect Tracking Register — PII Redaction Tool

This register tracks all defects, edge case issues, and quality hardening items identified and resolved during system development and Quality Assurance testing.

---

## Severity Classification Rules
- **CRITICAL**: Source document modified, confirmed original PII leak, data corruption, application crash.
- **HIGH**: Major PII category consistently fails, redaction fails for standard OpenXML structure, metric calculation error.
- **MEDIUM**: Workflow exception with workaround, UI/API contract mismatch, repeated request issue.
- **LOW**: Minor formatting flaw, cosmetic issue, typo in UI label.

---

## Defect Log & Resolution Status

| Defect ID | Severity | Component | Summary / Root Cause | Resolution / Fix Applied | Regression Test | Status |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **BUG-001** | **HIGH** | `organizationDetector.js` | Company names enclosed in unicode quotes (`“`, `”`) caused character offset shifts (`start` +1), causing 0.0% organization recall in baseline. | Added quotation mark trimming (`"`, `'`, `“`, `”`, `‘`, `’`, `«`, `»`, `„`) and offset adjustments. | `TEST 1` in `test_execution_014.js` | **RESOLVED** |
| **BUG-002** | **MEDIUM** | `personDetector.js` | All-caps section headings (`BOARD OF DIRECTORS`) matched 2-4 word capitalization regex rules. | Added `isHeaderUnit` all-caps section header suppression and expanded `nonPersonKeywords`. | `TEST 2` in `test_execution_014.js` | **RESOLVED** |
| **BUG-003** | **MEDIUM** | `phoneDetector.js` | Financial table 10-digit figures matched optional phone regex. | Enforced mandatory phone prefix (`+91`/`+`) or context keywords (`tel`, `phone`, `mobile`). | `TEST 4` in `test_execution_014.js` | **RESOLVED** |
| **BUG-004** | **LOW** | `emailDetector.js` | Website URLs (`www.sebi.gov.in`) matched loose email pattern. | Added `!/^www\./i.test(match)` check to reject URL domains missing `@` mailbox prefixes. | `TEST 6` in `test_execution_014.js` | **RESOLVED** |
| **BUG-005** | **MEDIUM** | `documentController.js` | Client lacked stream endpoint to download generated redacted DOCX file. | Created `downloadRedactedDocument` controller & registered route `GET /api/documents/:documentId/download`. | `TEST 7` in `test_execution_017.js` | **RESOLVED** |

---

## Defect Summary
- **Total Critical Bugs**: 0
- **Total High Severity Bugs**: 1 (Resolved)
- **Total Medium Severity Bugs**: 3 (Resolved)
- **Total Low Severity Bugs**: 1 (Resolved)
- **Open Defects**: **0**
- **System Defect Status**: **ALL BUGS RESOLVED (100% PASS)**
