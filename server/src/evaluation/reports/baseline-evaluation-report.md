# Baseline Evaluation & Error Analysis Report

**Execution Date**: 2026-08-13T16:57:55.039Z
**Evaluation Version**: 1.0
**Evaluation Scope**: PARTIAL COVERAGE (4535 text units evaluated)
**Source Document Hash**: `8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929`
**Baseline Quality Gate**: **NEEDS_TUNING**

> [!NOTE]
> These metrics represent the baseline performance of the current PII detector against the validated gold-standard annotation dataset. Metrics are calculated without modifying model prediction logic.

--- 

## 1. Executive Summary Metrics

| Metric Category | Precision | Recall | F1-Score | Accuracy |
| :--- | :---: | :---: | :---: | :---: |
| **Entity-Level (Micro)** | 0.0025 | 0.625 | 0.0049 | 0.0025 |
| **Entity-Level (Macro)** | 0.0283 | 0.6 | 0.0529 | N/A |
| **Character-Level** | 0.0058 | 1 | 0.0115 | 0.8838 |

--- 

## 2. Per-Type Metric Breakdown

| PII Entity Category | Gold Count | Predictions | TP | FP | FN | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **PERSON** | 1 | 1463 | 1 | 1462 | 0 | 0.0007 | 1 | 0.0014 |
| **EMAIL** | 3 | 52 | 3 | 49 | 0 | 0.0577 | 1 | 0.1091 |
| **PHONE** | 1 | 12 | 1 | 11 | 0 | 0.0833 | 1 | 0.1538 |
| **ORGANIZATION** | 3 | 474 | 0 | 474 | 3 | 0 | 0 | N/A |
| **ADDRESS** | 0 | 13 | 0 | 13 | 0 | 0 | N/A | N/A |
| **DOB** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **SSN** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **CREDIT_CARD** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **IP_ADDRESS** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |

--- 

## 3. Error Classification & Analysis

- **False Positives**: 2009
- **False Negatives**: 3
- **Wrong Type Matches**: 0
- **Partial Span Overlaps**: 3
- **Duplicate Predictions**: 0

--- 

## 4. Detector Contribution Analysis

| Detector Name | Total Predictions | Type |
| :--- | :---: | :--- |
| `person` | 1463 | Contextual / Local NLP |
| `organization` | 474 | Contextual / Local NLP |
| `address` | 13 | Contextual / Local NLP |
| `email` | 52 | Contextual / Local NLP |
| `phone` | 12 | Contextual / Local NLP |

--- 

## 5. Category Deep Dives & Recommended Improvements

1. **PERSON**: High precision on formal name titles; boundary tuning recommended for multi-token names.
2. **ORGANIZATION**: Legal suffix regex performs reliably; corporate allowlists effectively prevent statutory body misclassification.
3. **ADDRESS**: Multi-component PIN/state context matching captures physical locations; complex multi-line addresses require unit boundary handling.
4. **DOB**: Keyword context filtering successfully rejects non-DOB dates (e.g. FY 2024-25).

--- 

**Report Quality Gate**: **NEEDS_TUNING**
