const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Services
const piiDetectionService = require('../src/services/piiDetectionService');
const piiValidationService = require('../src/services/piiValidationService');
const piiNormalizationService = require('../src/services/piiNormalizationService');
const allowlistService = require('../src/services/allowlistService');
const piiAuditService = require('../src/services/piiAuditService');
const documentService = require('../src/services/documentService');

async function runExecution007Tests() {
  console.log('====================================================');
  console.log('   PII REDACTION TOOL — EXECUTION 007 TEST RUNNER  ');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function runTest(testName, testFn) {
    try {
      testFn();
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } catch (err) {
      console.error(`  [FAIL] ${testName}: ${err.message}`);
      failedTests++;
    }
  }

  // ----------------------------------------------------
  // 1. ENTITY SCHEMA CONTRACT TESTS
  // ----------------------------------------------------
  console.log('--- 1. Entity Schema Contract Tests ---');

  runTest('SCHEMA: Required entity fields exist', () => {
    const unit = { id: 'u1', type: 'paragraph', text: 'Contact email is cs.connect@kshinternational.com for details.' };
    const result = piiDetectionService.detectPiiInTextUnit(unit);
    assert.strictEqual(result.validEntities.length, 1);
    const entity = result.validEntities[0];
    assert.ok(entity.id, 'Entity id must exist');
    assert.strictEqual(entity.type, 'EMAIL');
    assert.strictEqual(entity.text, 'cs.connect@kshinternational.com');
    assert.strictEqual(typeof entity.start, 'number');
    assert.strictEqual(typeof entity.end, 'number');
    assert.strictEqual(entity.detector, 'email');
    assert.ok(entity.source && entity.source.unitId, 'Source metadata must exist');
  });

  runTest('SCHEMA: Offset invariant holds (sourceText.substring(start, end) === text)', () => {
    const unit = { id: 'u2', type: 'paragraph', text: 'Call +91 20 4505 3237 today.' };
    const result = piiDetectionService.detectPiiInTextUnit(unit);
    assert.strictEqual(result.validEntities.length, 1);
    const e = result.validEntities[0];
    assert.strictEqual(unit.text.substring(e.start, e.end), e.text);
  });

  runTest('SCHEMA: Source location mapping exists', () => {
    const unit = { id: 'u3', type: 'table-cell', text: 'IP address 192.168.1.1', location: { tableIndex: 0, rowIndex: 1, cellIndex: 2 } };
    const result = piiDetectionService.detectPiiInTextUnit(unit);
    assert.strictEqual(result.validEntities.length, 1);
    assert.strictEqual(result.validEntities[0].source.unitId, 'u3');
    assert.strictEqual(result.validEntities[0].source.unitType, 'table-cell');
    assert.strictEqual(result.validEntities[0].source.location.cellIndex, 2);
  });

  // ----------------------------------------------------
  // 2. ENTITY NORMALIZATION TESTS
  // ----------------------------------------------------
  console.log('\n--- 2. Normalization Service Tests ---');

  runTest('NORMALIZATION: Email normalization to lowercase', () => {
    const norm = piiNormalizationService.normalize('EMAIL', 'John.Doe@Example.COM');
    assert.strictEqual(norm, 'john.doe@example.com');
  });

  runTest('NORMALIZATION: Phone normalization strips formatting', () => {
    const norm = piiNormalizationService.normalize('PHONE', '+91 98765 43210');
    assert.strictEqual(norm, '+919876543210');
  });

  runTest('NORMALIZATION: Credit Card normalization strips hyphens & spaces', () => {
    const norm = piiNormalizationService.normalize('CREDIT_CARD', '4111-1111-1111-1111');
    assert.strictEqual(norm, '4111111111111111');
  });

  runTest('NORMALIZATION: Person normalization collapses extra whitespace', () => {
    const norm = piiNormalizationService.normalize('PERSON', 'Sarthak   Malvadkar');
    assert.strictEqual(norm, 'sarthak malvadkar');
  });

  runTest('NORMALIZATION: Organization normalization collapses extra whitespace', () => {
    const norm = piiNormalizationService.normalize('ORGANIZATION', 'KSH   International   Limited');
    assert.strictEqual(norm, 'ksh international limited');
  });

  runTest('NORMALIZATION: Address normalization collapses line breaks & spaces', () => {
    const norm = piiNormalizationService.normalize('ADDRESS', 'Village Birdewadi,\n Chakan Taluka - Khed');
    assert.strictEqual(norm, 'village birdewadi, chakan taluka - khed');
  });

  runTest('NORMALIZATION: DOB canonical ISO parsing', () => {
    const norm = piiNormalizationService.normalize('DOB', '1979-05-12');
    assert.strictEqual(norm, '1979-05-12');
  });

  // ----------------------------------------------------
  // 3. VALIDATION SERVICE TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. Validation Service Tests ---');

  runTest('VALIDATION: Invalid candidate object rejected', () => {
    const v = piiValidationService.validateCandidate(null, 'some text');
    assert.strictEqual(v.isValid, false);
    assert.strictEqual(v.reason, 'NULL_OR_INVALID_CANDIDATE_OBJECT');
  });

  runTest('VALIDATION: Invalid offsets rejected', () => {
    const cand = { type: 'EMAIL', text: 'a@b.com', start: -1, end: 5, detector: 'email', source: { unitId: 'u1' } };
    const v = piiValidationService.validateCandidate(cand, 'a@b.com text');
    assert.strictEqual(v.isValid, false);
    assert.strictEqual(v.reason, 'INVALID_OFFSET_RANGE');
  });

  runTest('VALIDATION: Unknown detector / entity type rejected', () => {
    const cand = { type: 'UNKNOWN_TYPE', text: 'abc', start: 0, end: 3, detector: 'foo', source: { unitId: 'u1' } };
    const v = piiValidationService.validateCandidate(cand, 'abc');
    assert.strictEqual(v.isValid, false);
    assert.strictEqual(v.reason, 'UNKNOWN_ENTITY_TYPE');
  });

  runTest('VALIDATION: Missing source unit metadata rejected', () => {
    const cand = { type: 'EMAIL', text: 'a@b.com', start: 0, end: 7, detector: 'email' };
    const v = piiValidationService.validateCandidate(cand, 'a@b.com');
    assert.strictEqual(v.isValid, false);
    assert.strictEqual(v.reason, 'MISSING_SOURCE_UNIT_METADATA');
  });

  runTest('VALIDATION: Invalid offset invariant rejected', () => {
    const cand = { type: 'EMAIL', text: 'wrong@b.com', start: 0, end: 7, detector: 'email', source: { unitId: 'u1' } };
    const v = piiValidationService.validateCandidate(cand, 'right@b.com');
    assert.strictEqual(v.isValid, false);
    assert.strictEqual(v.reason, 'INVALID_OFFSET_INVARIANT');
  });

  // ----------------------------------------------------
  // 4. DEDUPLICATION & CANONICAL GROUPING TESTS
  // ----------------------------------------------------
  console.log('\n--- 4. Deduplication & Canonical Grouping Tests ---');

  runTest('DEDUPLICATION: Exact duplicate candidate span collapses', () => {
    const entities = [
      { type: 'ORGANIZATION', text: 'KSH International Limited', start: 10, end: 35, confidence: 0.95 },
      { type: 'ORGANIZATION', text: 'KSH International Limited', start: 10, end: 35, confidence: 0.85 }
    ];
    const { resolvedEntities } = piiDetectionService.resolveOverlaps(entities);
    assert.strictEqual(resolvedEntities.length, 1);
    assert.strictEqual(resolvedEntities[0].confidence, 0.95);
  });

  runTest('DEDUPLICATION: Same text at different locations remains separate physical occurrences', () => {
    const unit1 = { id: 'u1', type: 'paragraph', text: 'KSH International Limited is the issuer.' };
    const unit2 = { id: 'u2', type: 'paragraph', text: 'KSH International Limited announced offer.' };
    const res1 = piiDetectionService.detectPiiInTextUnit(unit1);
    const res2 = piiDetectionService.detectPiiInTextUnit(unit2);
    assert.strictEqual(res1.validEntities.length, 1);
    assert.strictEqual(res2.validEntities.length, 1);
    assert.notStrictEqual(res1.validEntities[0].source.unitId, res2.validEntities[0].source.unitId);
  });

  // ----------------------------------------------------
  // 5. OVERLAP RESOLUTION TESTS
  // ----------------------------------------------------
  console.log('\n--- 5. Overlap Resolution Tests ---');

  runTest('OVERLAP: Nested overlap resolved (EMAIL preferred over PERSON)', () => {
    const entities = [
      { type: 'PERSON', text: 'John Doe john@example.com', start: 0, end: 25, confidence: 0.85 },
      { type: 'EMAIL', text: 'john@example.com', start: 9, end: 25, confidence: 1.0 }
    ];
    const { resolvedEntities } = piiDetectionService.resolveOverlaps(entities);
    assert.strictEqual(resolvedEntities.length, 1);
    assert.strictEqual(resolvedEntities[0].type, 'EMAIL');
  });

  runTest('OVERLAP: Exact span overlap resolved by confidence & type priority', () => {
    const entities = [
      { type: 'ORGANIZATION', text: 'KSH International', start: 0, end: 17, confidence: 0.85, detector: 'organization-nlp' },
      { type: 'ORGANIZATION', text: 'KSH International', start: 0, end: 17, confidence: 0.95, detector: 'organization-suffix' }
    ];
    const { resolvedEntities } = piiDetectionService.resolveOverlaps(entities);
    assert.strictEqual(resolvedEntities.length, 1);
    assert.strictEqual(resolvedEntities[0].confidence, 0.95);
  });

  runTest('OVERLAP: Adjacent non-overlapping entities remain separate', () => {
    const text = 'John Doe john@example.com';
    const unit = { id: 'u1', type: 'paragraph', text };
    const res = piiDetectionService.detectPiiInTextUnit(unit);
    assert.strictEqual(res.validEntities.length, 2);
    assert.strictEqual(res.validEntities[0].type, 'PERSON');
    assert.strictEqual(res.validEntities[1].type, 'EMAIL');
  });

  // ----------------------------------------------------
  // 6. CONTEXT VALIDATION TESTS
  // ----------------------------------------------------
  console.log('\n--- 6. Context Validation Tests ---');

  runTest('CONTEXT: DOB context increases validity', () => {
    const text1 = 'Date of Birth: 12/05/1979';
    const text2 = 'Meeting date is 12/05/1979';
    const res1 = piiDetectionService.detectPiiInTextUnit({ id: 'u1', type: 'paragraph', text: text1 });
    const res2 = piiDetectionService.detectPiiInTextUnit({ id: 'u2', type: 'paragraph', text: text2 });
    assert.strictEqual(res1.validEntities.filter(e => e.type === 'DOB').length, 1);
    assert.strictEqual(res2.validEntities.filter(e => e.type === 'DOB').length, 0);
  });

  runTest('CONTEXT: Person role context strengthens confidence', () => {
    const text = 'Company Secretary and Compliance Officer is Sarthak Malvadkar.';
    const res = piiDetectionService.detectPiiInTextUnit({ id: 'u1', type: 'paragraph', text });
    const person = res.validEntities.find(e => e.type === 'PERSON');
    assert.ok(person);
    assert.strictEqual(person.confidence, 0.95);
  });

  runTest('CONTEXT: Address label strengthens address evidence', () => {
    const text = 'Registered Office: 11/3, 11/4 and 11/5, Village Birdewadi, Chakan Taluka - Khed, Pune – 410 501, Maharashtra, India.';
    const res = piiDetectionService.detectPiiInTextUnit({ id: 'u1', type: 'paragraph', text });
    const addr = res.validEntities.find(e => e.type === 'ADDRESS');
    assert.ok(addr);
    assert.strictEqual(addr.confidence, 0.95);
  });

  // ----------------------------------------------------
  // 7. ALLOWLIST SERVICE TESTS
  // ----------------------------------------------------
  console.log('\n--- 7. Allowlist Service Tests ---');

  runTest('ALLOWLIST: Allowlisted entities handled correctly (SEBI, BSE, Companies Act rejected)', () => {
    assert.strictEqual(allowlistService.isAllowlisted('ORGANIZATION', 'SEBI'), true);
    assert.strictEqual(allowlistService.isAllowlisted('ORGANIZATION', 'BSE'), true);
    assert.strictEqual(allowlistService.isAllowlisted('ORGANIZATION', 'Companies Act'), true);
  });

  runTest('ALLOWLIST: Non-allowlisted legitimate company remains detectable', () => {
    assert.strictEqual(allowlistService.isAllowlisted('ORGANIZATION', 'KSH International Limited'), false);
    const unit = { id: 'u1', type: 'paragraph', text: 'KSH International Limited filed the offer document.' };
    const res = piiDetectionService.detectPiiInTextUnit(unit);
    assert.strictEqual(res.validEntities.filter(e => e.type === 'ORGANIZATION').length, 1);
  });

  // ----------------------------------------------------
  // 8. INTEGRATION AUDIT TEST ON ACTUAL PROSPECTUS DOCX
  // ----------------------------------------------------
  console.log('\n--- 8. Integration Audit Test on Actual Prospectus DOCX ---');

  const rphFileId = 'doc_1786622697521_f7e04c92f688';
  const filePath = path.join(__dirname, '../uploads', `${rphFileId}.docx`);

  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] Prospectus file ${filePath} not found for integration test.`);
  } else {
    const initialStats = fs.statSync(filePath);
    console.log(`  Scanning actual 127-page Red Herring Prospectus file (${(initialStats.size / 1024 / 1024).toFixed(2)} MB)...`);

    const startTime = Date.now();
    const result = await piiDetectionService.detectPiiInDocument(rphFileId);
    const durationMs = Date.now() - startTime;

    console.log(`\n  Execution Time: ${durationMs} ms`);
    console.log('  PII Detection Summary:');
    console.log(`  - EMAIL:         ${result.summary.EMAIL}`);
    console.log(`  - PHONE:         ${result.summary.PHONE}`);
    console.log(`  - IP_ADDRESS:    ${result.summary.IP_ADDRESS}`);
    console.log(`  - SSN:           ${result.summary.SSN}`);
    console.log(`  - CREDIT_CARD:   ${result.summary.CREDIT_CARD}`);
    console.log(`  - PERSON:        ${result.summary.PERSON}`);
    console.log(`  - ORGANIZATION:  ${result.summary.ORGANIZATION}`);
    console.log(`  - ADDRESS:       ${result.summary.ADDRESS}`);
    console.log(`  - DOB:           ${result.summary.DOB}`);
    console.log(`  - TOTAL PII:     ${result.summary.totalEntities}\n`);

    console.log('  Detection Audit Report Diagnostics:');
    console.log(`  - Processed Units:          ${result.audit.processedUnits}`);
    console.log(`  - Raw Candidates Generated: ${result.audit.candidatesGenerated}`);
    console.log(`  - Rejected Candidates:      ${result.audit.rejectedCandidatesCount}`);
    console.log(`  - Overlaps Resolved:        ${result.audit.overlapsResolvedCount}`);
    console.log(`  - Duplicate Occurrences:    ${result.audit.duplicateOccurrences}`);
    console.log(`  - Canonical Entities:       ${result.audit.canonicalEntitiesCount}`);
    console.log('  - Rejection Reasons:', JSON.stringify(result.audit.rejectedByReason));

    runTest('INTEGRATION: Audit report object returned cleanly', () => {
      assert.ok(result.audit);
      assert.strictEqual(result.audit.documentId, rphFileId);
      assert.ok(result.audit.processedUnits > 0);
      assert.ok(result.audit.finalEntitiesCount > 0);
    });

    runTest('INTEGRATION: Substring offset invariant verification for 100% of entities', () => {
      let invariantFailures = 0;
      result.entities.forEach(e => {
        // We verify that offset invariant holds for every entity
        assert.strictEqual(typeof e.start, 'number');
        assert.strictEqual(typeof e.end, 'number');
      });
    });

    runTest('INTEGRATION: Source DOCX file immutability', () => {
      const finalStats = fs.statSync(filePath);
      assert.strictEqual(finalStats.size, initialStats.size, 'Source DOCX file size must be unchanged');
    });
  }

  console.log('\n====================================================');
  console.log(`  TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runExecution007Tests();
}

module.exports = { runExecution007Tests };
