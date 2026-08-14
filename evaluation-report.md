# PII REDACTION TOOL
## Evaluation Strategy & Metrics Report

---

### 1. Evaluation Objective

The evaluation measures how effectively the PII Redaction Tool detects and redacts personally identifiable information while minimizing incorrect redactions.

The evaluation focuses on:
- Detection coverage
- Precision
- Recall
- F1-score
- Character-level accuracy
- Leakage verification
- Per-PII-type performance

---

### 2. Evaluation Dataset

**Primary document**: `Red Herring Prospectus.docx`

The available gold annotations represent a validated subset of the document. Therefore, the prospectus evaluation is reported as a **PARTIAL DATASET EVALUATION**.

Predictions outside the validated gold coverage are not treated as confirmed false positives unless they fall within an annotated evaluation region.

---

### 3. PII Categories

The system supports 9 PII categories:
- `PERSON`
- `EMAIL`
- `PHONE`
- `ORGANIZATION`
- `ADDRESS`
- `DOB`
- `SSN`
- `CREDIT_CARD`
- `IP_ADDRESS`

---

### 4. Evaluation Method

The pipeline sequence:

```
DOCX
  ↓
Text Extraction
  ↓
PII Detection
  ↓
Normalization
  ↓
Deduplication
  ↓
Gold Matching
  ↓
TP / FP / FN
  ↓
Precision / Recall / F1
  ↓
Redaction
  ↓
Leakage Verification
```

---

### 5. Entity Matching

A predicted entity is matched against the gold annotation using:
- PII type
- normalized value
- document position/span where applicable

Normalization is used for comparison only and does not modify the original document.

---

### 6. Metrics

#### Precision
$$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}}$$
Precision measures how many predicted PII entities are actually correct.

#### Recall
$$\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}}$$
Recall measures how many gold PII entities were successfully detected.

#### F1-score
$$\text{F1} = \frac{2 \times \text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$
F1 provides a combined measure of precision and recall.

#### Character-Level Accuracy
Character-level accuracy measures the proportion of evaluated text units that are correctly classified as PII/non-PII.

This metric is reported separately from entity-level precision and recall because a high character-level accuracy does not necessarily mean high PII detection precision.

---

### 7. Leakage Verification

After redaction, the generated DOCX is scanned against the original PII values.

The objective is to verify that original PII values are not still present in the redacted document.

The leakage check distinguishes original PII from expected synthetic replacement values.

---

### 8. Current Evaluation Results

#### Prospectus Evaluation:
- **True Positives (TP)**: 8
- **False Negatives (FN)**: 0
- **False Positives (FP)**: 1,600 (Baseline Frozen Benchmark Scope)

- **Entity Micro Recall**: **100.00%**
- **Entity Micro Precision**: **0.50%**
- **Entity Micro F1**: **0.0099**

- **Character-Level Accuracy**: **90.55%**

> [!IMPORTANT]
> **Metric Disclaimer**: These metrics represent the validated gold-covered subset and should not be interpreted as full-document ground-truth metrics.

---

### 9. Per-Type Results

| PII Category | Gold Count | True Positives (TP) | False Positives (FP) | Recall | Precision |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **PERSON** | 1 | 1 | 1,049 | **100.00%** | 0.10% |
| **EMAIL** | 3 | 3 | 49 | **100.00%** | 5.77% |
| **PHONE** | 1 | 1 | 11 | **100.00%** | 8.33% |
| **ORGANIZATION** | 3 | 3 | 478 | **100.00%** | 0.62% |
| **ADDRESS** | 0 | 0 | 13 | N/A | N/A |
| **DOB** | 0 | 0 | 0 | N/A | N/A |
| **SSN** | 0 | 0 | 0 | N/A | N/A |
| **CREDIT_CARD** | 0 | 0 | 0 | N/A | N/A |
| **IP_ADDRESS** | 0 | 0 | 0 | N/A | N/A |

---

### 10. Redaction Verification

The final redacted DOCX is independently checked after generation.

#### Current Leakage Result:
- **Confirmed Original Leaks**: **0**
- **Possible Leaks**: **0**

The redacted document is also structurally validated as a DOCX.

---

### 11. Limitations

The primary limitation is partial gold coverage. The prospectus contains many legitimate names, organizations, addresses and contact details that may not be represented in the available gold annotations.

Therefore, predictions outside validated gold coverage should not automatically be interpreted as genuine false positives.

The system's performance on the complete document cannot be claimed without exhaustive ground-truth annotation.

---

### 12. Synthetic Capability Evaluation

A separate synthetic test set is used to verify support for all nine required PII categories:
1. `PERSON`
2. `EMAIL`
3. `PHONE`
4. `ORGANIZATION`
5. `ADDRESS`
6. `DOB`
7. `SSN`
8. `CREDIT_CARD`
9. `IP_ADDRESS`

This capability evaluation is kept separate from the prospectus gold-dataset metrics.

---

### 13. Conclusion

The evaluation combines:
- gold-annotation entity matching
- precision
- recall
- F1-score
- character-level accuracy
- leakage verification
- per-type analysis
- synthetic category testing

The evaluation results are reported transparently with the limitations of the available gold dataset.
