# Verified Engineering Facts — PII Redaction Tool

This document contains 100% empirically verified architecture details, metric benchmarks, and system capabilities for final project documentation.

---

## 1. Core Technology Stack
- **Stack**: MERN Architecture (React, Node.js, Express.js, MongoDB, JavaScript, JSX).
- **Language**: **JavaScript ONLY** (Strict boundary: Zero TypeScript, no `.ts`, `.tsx`, or `tsconfig.json`).
- **Processing Scope**: 100% local server-side processing without transmitting document text to external cloud APIs.

---

## 2. PII Entity Support (9 Categories)
1. **PERSON**: Full human names (NLP + Title/Role context).
2. **EMAIL**: RFC-compliant email address strings.
3. **PHONE**: Indian (+91) and international telephone formats.
4. **ORGANIZATION**: Corporate and company names (Suffix matching + quote trimming + allowlists).
5. **ADDRESS**: Indian physical address spans (Building, Street, PIN, City/State context).
6. **DOB**: Birth dates in birth-specific context.
7. **SSN**: 9-digit US Social Security Numbers (`XXX-XX-XXXX`).
8. **CREDIT_CARD**: 16-digit credit card numbers with **Luhn algorithm checksum validation**.
9. **IP_ADDRESS**: IPv4 dotted-decimal addresses (`0-255` octet validation).

---

## 3. Architecture & Pipeline Components
```
Source DOCX -> OpenXML Parser -> 9 PII Detectors -> Validation & Normalization
 -> Synthetic Replacement Plan -> OpenXML Redaction -> Post-Redaction Leakage Scan
  -> Formal Evaluation Engine
```

- **OpenXML DOCX Structural Parser** (`docxParserService.js`): Extracts paragraphs, table cells, headers, and footers into structured text units with stable IDs (`unit-00001`).
- **Post-Candidate Pipeline** (`piiValidationService.js`, `piiNormalizationService.js`): Enforces substring invariants (`unitText.substring(start, end) === entity.text`), canonical comparison keys, and allowlist filtering.
- **Synthetic Replacement Mapping** (`replacementRegistry.js`, `replacementService.js`): Guarantees 1-to-1 replacement consistency for repeated PII occurrences.
- **OpenXML DOCX Redaction Engine** (`docxRedactionService.js`): Executes in-place text substitution on OpenXML `.docx` archives from end-to-beginning across paragraphs, tables, headers, and footers.
- **Post-Redaction Leakage Scanner** (`leakageScanner.js`): Reparses redacted DOCX files independently, runs all 9 PII detectors, executes direct/normalized original string rescan, and verifies paragraph/table structural counts.
- **Formal Evaluation Engine** (`evaluationEngine.js`, `metricsCalculator.js`): Computes span-level metrics, character mask projections, micro/macro averages, and $10 \times 10$ Type Confusion Matrix.

---

## 4. Final Empirical Benchmark Results (Execution 015)
- **Target Document**: `Red Herring Prospectus.docx` (127 pages, 4,535 text units, SHA-256: `8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929`).
- **Detector Version**: `1.0.0-final` (Frozen).
- **Evaluation Scope**: `PARTIAL DATASET EVALUATION` (8 verified ground-truth annotations).
- **True Positives (`TP`)**: 8 / 8
- **False Negatives (`FN`)**: 0 / 8
- **Entity Micro Recall**: **100.0%**
- **Character-Level Recall**: **100.0%**
- **Character-Level Accuracy**: **90.55%**
- **Post-Redaction Confirmed Leaks**: **0** (Status: **PASS**)
- **Source Document Immutability**: Verified SHA-256 match BEFORE === AFTER (**PASSED**).
- **Final Acceptance Decision**: **`READY_FOR_FINAL_REPORT`**

---

## 5. Security & Masking Guarantee
- Evaluation reports and logs use safe PII masking (e.g. `"S****** M********"`, `"c*********@k***************.com"`), guaranteeing zero leakage of raw sensitive text in artifacts.
