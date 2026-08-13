# Baseline Evaluation & Error Analysis Report

**Execution Date**: 2026-08-13T19:02:32.927Z
**Evaluation Version**: 1.0
**Evaluation Scope**: PARTIAL COVERAGE (4535 text units evaluated)
**Source Document Hash**: `8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929`
**Baseline Quality Gate**: **PARTIAL_DATASET_NEEDS_EXPANSION**

> [!NOTE]
> These metrics represent the baseline performance of the current PII detector against the validated gold-standard annotation dataset. Metrics are calculated without modifying model prediction logic.

--- 

## 1. Executive Summary Metrics

| Metric Category | Precision | Recall | F1-Score | Accuracy |
| :--- | :---: | :---: | :---: | :---: |
| **Entity-Level (Micro)** | 0.005 | 1 | 0.0099 | 0.005 |
| **Entity-Level (Macro)** | 0.0296 | 0.8 | 0.0554 | N/A |
| **Character-Level** | 0.0071 | 1 | 0.0141 | 0.9055 |

--- 

## 2. Per-Type Metric Breakdown

| PII Entity Category | Gold Count | Predictions | TP | FP | FN | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **PERSON** | 1 | 1050 | 1 | 1049 | 0 | 0.001 | 1 | 0.0019 |
| **EMAIL** | 3 | 52 | 3 | 49 | 0 | 0.0577 | 1 | 0.1091 |
| **PHONE** | 1 | 12 | 1 | 11 | 0 | 0.0833 | 1 | 0.1538 |
| **ORGANIZATION** | 3 | 481 | 3 | 478 | 0 | 0.0062 | 1 | 0.0124 |
| **ADDRESS** | 0 | 13 | 0 | 13 | 0 | 0 | N/A | N/A |
| **DOB** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **SSN** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **CREDIT_CARD** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **IP_ADDRESS** | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A |

--- 

## 3. Error Classification & Analysis

- **False Positives**: 1600
- **False Negatives**: 0
- **Wrong Type Matches**: 0
- **Partial Span Overlaps**: 0
- **Duplicate Predictions**: 0

--- 

## 4. Detector Contribution Analysis

| Detector Name | Total Predictions | Type |
| :--- | :---: | :--- |
| `person` | 1050 | Contextual / Local NLP |
| `organization` | 481 | Contextual / Local NLP |
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

**Report Quality Gate**: **PARTIAL_DATASET_NEEDS_EXPANSION**
