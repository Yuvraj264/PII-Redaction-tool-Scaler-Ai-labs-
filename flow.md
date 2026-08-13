# PII Redaction Tool — System Flow

This document details the operational execution flows of the PII Redaction Tool system.

---

## Component Status Overview

### [IMPLEMENTED]
- **Express Server Foundation** (`server/server.js`, `server/src/app.js`)
- **Health Check Endpoint** (`GET /api/health`)
- **DOCX Ingestion Engine & Validation** (`POST /api/documents/upload`)
- **OpenXML DOCX Structural Parser & Source Mapping** (`POST /api/documents/:documentId/parse`)
- **Full PII Detection Engine (9 Entity Categories)** (`POST /api/documents/:documentId/detect`)
- **5 Core Deterministic PII Detectors**:
  - `emailDetector.js` (**EMAIL**)
  - `phoneDetector.js` (**PHONE**)
  - `ipDetector.js` (**IP_ADDRESS**)
  - `ssnDetector.js` (**SSN**)
  - `creditCardDetector.js` (**CREDIT_CARD** with Luhn validation)
- **4 Contextual / NLP PII Detectors**:
  - `personDetector.js` (**PERSON** via local NLP + title context + false positive filters)
  - `organizationDetector.js` (**ORGANIZATION** via corporate suffixes + allowlist filtering)
  - `addressDetector.js` (**ADDRESS** via multi-component location rules & PIN matching)
  - `dobDetector.js` (**DOB** via explicit DOB context keyword matching & date parsers)
- **Centralized Allowlist Service** (`server/src/services/allowlistService.js`)
- **PII Normalization Service** (`server/src/services/piiNormalizationService.js`)
- **PII Validation & Offset Invariant Checker** (`server/src/services/piiValidationService.js`)
- **PII Audit & Diagnostics Generator** (`server/src/services/piiAuditService.js`)
- **PII Detection Service & Overlap Resolver** (`server/src/services/piiDetectionService.js`)
- **Synthetic Replacement Mapping Subsystem**:
  - `replacementRegistry.js` (Bidirectional canonicalKey ↔ replacement mapping with collision prevention)
  - `replacementService.js` (Replacement Plan builder & API service)
  - **9 Type-Specific Synthetic Generators**:
    - `personGenerator.js` (**PERSON** synthetic name pool)
    - `emailGenerator.js` (**EMAIL** safe `@example.com` domain)
    - `phoneGenerator.js` (**PHONE** reserved test range)
    - `organizationGenerator.js` (**ORGANIZATION** synthetic legal entities)
    - `addressGenerator.js` (**ADDRESS** synthetic physical addresses)
    - `dobGenerator.js` (**DOB** synthetic birth dates)
    - `ssnGenerator.js` (**SSN** test block `900-XX-XXXX`)
    - `creditCardGenerator.js` (**CREDIT_CARD** Luhn test cards)
    - `ipGenerator.js` (**IP_ADDRESS** RFC 5737 doc block)
- **Multer Upload Middleware** (`server/src/middleware/uploadMiddleware.js`)
- **Document Services** (`server/src/services/documentService.js`, `server/src/services/docxParserService.js`)
- **Temporary Upload Storage** (`server/uploads/` [Git-ignored])
- **Environment Configuration Manager** (`server/src/config/uploadConfig.js`, `server/src/config/db.js`)
- **Error & Not-Found Middleware** (`server/src/middleware/`)
- **React Application Shell** (`client/src/App.jsx`)
- **Interactive DOCX Drag & Drop Upload Component** (`client/src/components/DocumentUploadPlaceholder.jsx`)
- **Vite Proxy & Dev Environment** (`client/vite.config.js`)
- **Automated PII Detector, Audit & Replacement Test Suite** (`server/tests/test_execution_008.js`)

### [PLANNED — NOT IMPLEMENTED]
- **OpenXML DOCX Text Substitution Engine** (DOCX text node replacement planned for Execution 009)
- **Evaluation & Validation Engine** (Precision/Recall metrics planned for Execution 010)
- **MongoDB Data Persistence** (Redaction job metadata & history models planned for future execution)
- **Interactive PII Review UI** (Document preview & entity toggle UI planned for future execution)

---

## FLOW-001 — Application Startup & Health Check

### Overview
Initial system boots up the Express REST API backend and React Vite frontend. The client polls the backend health status endpoint (`GET /api/health`) to confirm system readiness.

---

## FLOW-002 — DOCX Upload Flow

### Overview
Client submits a `.docx` document to the ingestion API. The server validates format and size, stores the file securely in temporary storage, generates a unique document ID, and returns safe metadata.

---

## FLOW-003 — DOCX Parsing Flow

### Overview
Parses an ingested DOCX document into a structured internal model containing paragraphs, table cells, headers, and footers with stable unit IDs (`unit-00001`) and location metadata.

---

## FLOW-004 — Extraction Verification and Source Mapping

### Overview
Validates structural text extraction, OpenXML run-level breakdown (`<w:r>`), character offset conventions (`start` inclusive, `end` exclusive), and deterministic location mapping across paragraphs, tables, headers, and footers for downstream PII targeting.

---

## FLOW-005 — Deterministic PII Detection

### Overview
Scans structured document units using 5 deterministic PII detectors (**EMAIL**, **PHONE**, **IP_ADDRESS**, **SSN**, **CREDIT_CARD** with Luhn algorithm validation), resolves overlapping spans, sorts entities deterministically, and attaches source location objects.

---

## FLOW-006 — Contextual and NLP PII Detection

### Overview
Scans structured document units across 4 contextual & local NLP PII detectors (**PERSON**, **ORGANIZATION**, **ADDRESS**, **DOB**), applies false positive filtering, evaluates context windows, filters against regulatory allowlists, resolves entity overlaps, and attaches source location objects.

---

## FLOW-007 — Entity Normalization, Validation, Conflict Resolution & Audit

### Overview
Processes raw candidate entities emitted by all 9 detectors through a post-candidate pipeline: canonical contract formatting, offset invariant enforcement, type-specific comparison key normalization, validation layer filtering with diagnostic rejection reasons, canonical duplicate grouping, rank-based overlap resolution, and detection audit report generation.

---

## FLOW-008 — Synthetic PII Replacement Mapping

### Overview
Maps validated PII entities to realistic synthetic alternatives, guarantees 1-to-1 consistency for repeated entity occurrences, prevents synthetic replacement collisions, and generates a structured, descending-offset sorted Replacement Plan without modifying source DOCX files.

---

### FLOW-008-A — Canonical Entity Creation
- **Entry Point**: `piiNormalizationService.getCanonicalKey(type, text)`
- **Input**: Validated PII entity type and text.
- **Processing**: Derives canonical comparison key (`type:normalizedValue`) using type-specific normalization.
- **Output**: Deterministic string key (e.g. `organization:ksh international limited`).
- **Status**: **[IMPLEMENTED]**

---

### FLOW-008-B — Replacement Registry Lookup & Registry Map
- **Entry Point**: `replacementRegistry.getOrCreateReplacement(canonicalKey, entity)`
- **Input**: Canonical key and entity object.
- **Processing**:
  1. Checks `canonicalMap` for existing key.
  2. If found, reuses existing synthetic replacement (guarantees consistency across all document occurrences).
  3. If not found, invokes type-specific generator and checks `reverseMap` for collisions.
  4. Stores bidirectional mapping in registry.
- **Output**: `{ canonicalKey, replacement, isReused }`.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-008-C — Synthetic Generator Selection
- **Entry Point**: `generator.generate(entity, index)`
- **Input**: PII entity and generator index counter.
- **Processing**: Executes type-specific synthetic generator:
  - `personGenerator`: Selects realistic synthetic names (`Arjun Mehta`, `Riya Sharma`).
  - `emailGenerator`: Generates safe `@example.com` email (`arjun.mehta@example.com`).
  - `phoneGenerator`: Generates reserved series Indian phone number (`+91 98765 01001`).
  - `organizationGenerator`: Generates synthetic company preserving legal suffix (`Apex Meridian Technologies Private Limited`).
  - `addressGenerator`: Generates multi-component synthetic address (`42 Industrial Estate Road...`).
  - `dobGenerator`: Generates valid birth date (`1985-04-12`).
  - `ssnGenerator`: Generates test SSN (`900-01-0001`).
  - `creditCardGenerator`: Generates Luhn-valid test card (`4111-1111-1111-1111`).
  - `ipGenerator`: Generates RFC 5737 IPv4 address (`192.0.2.1`).
- **Output**: Synthetic replacement string.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-008-D — Collision Prevention
- **Entry Point**: `replacementRegistry.getOrCreateReplacement()` collision check loop.
- **Input**: Candidate synthetic replacement string.
- **Processing**: Checks `reverseMap.has(candidateReplacement)`. If collision detected or replacement equals original text, increments generator index counter until a unique replacement string is obtained.
- **Output**: Collision-free synthetic replacement string.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-008-E — Replacement Plan Generation
- **Entry Point**: `replacementService.generateReplacementPlan(documentId)`
- **Input**: Document ID.
- **Processing**:
  1. Retrieves valid PII entities from `piiDetectionService.detectPiiInDocument(documentId)`.
  2. Maps each entity to synthetic replacement via `ReplacementRegistry`.
  3. Groups replacement items by text unit ID (`unitId`).
  4. Calculates length changes (`originalLength`, `replacementLength`, `lengthDelta`).
  5. Assembles unit plans and summary metrics.
- **Output**: Structured Replacement Plan JSON payload.
- **Status**: **[IMPLEMENTED]**

---

### FLOW-008-F — Replacement Plan Descending Ordering
- **Entry Point**: `replacementService.generateReplacementPlan()` sorting step.
- **Input**: Unit plan replacements array.
- **Processing**: Sorts replacements within each text unit plan by `start` offset **DESCENDING** (e.g. offset 100 before offset 20).
- **Rationale**: Downstream in-place string replacement executed from end-of-string to beginning ensures earlier character offsets remain unaffected by length changes.
- **Output**: Descending-sorted unit plans.
- **Status**: **[IMPLEMENTED]**

---

### Comprehensive Data Flow Diagram

```
Validated PII Entities (piiDetectionService.js)
  │
  ▼
Canonical Entity Key Generation (piiNormalizationService.js)
  │
  ▼
Replacement Registry Lookup (replacementRegistry.js)
  ├─► Existing Key? ──► Reuse Synthetic Replacement (Guarantees Consistency)
  └─► New Key? ───────► Execute Type-Specific Generator (server/src/replacement/generators/)
                          │
                          ▼
                    Collision Check (reverseMap verification)
                          │
                          ▼
                    Store canonicalKey ↔ replacement mapping
  │
  ▼
Replacement Plan Builder (replacementService.js)
  ├── Group replacements by unitId
  ├── Sort replacements per text unit by START DESCENDING
  └── Track originalLength, replacementLength, and lengthDelta
  │
  ▼
HTTP 200 OK JSON Response (POST /api/documents/:documentId/replacement-plan)
  └── Safe Metadata Summary + Sample Unit Plans
```
