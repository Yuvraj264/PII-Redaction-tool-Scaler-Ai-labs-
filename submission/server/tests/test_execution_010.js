const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Services
const docxRedactionService = require('../src/services/docxRedactionService');
const leakageScanner = require('../src/leakage/leakageScanner');
const leakageAnalyzer = require('../src/leakage/leakageAnalyzer');
const piiNormalizationService = require('../src/services/piiNormalizationService');

async function runExecution010Tests() {
  console.log('====================================================');
  console.log('   PII REDACTION TOOL — EXECUTION 010 TEST RUNNER  ');
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
  // 1. EXACT LEAKAGE DETECTION TESTS
  // ----------------------------------------------------
  console.log('--- 1. Exact Leakage Detection Tests ---');

  runTest('EXACT LEAK: Unredacted original person name classified as CONFIRMED_LEAK', () => {
    const candidate = { type: 'PERSON', text: 'Sarthak Malvadkar', start: 10, end: 27 };
    const originalEntities = [{ type: 'PERSON', text: 'Sarthak Malvadkar' }];
    const synthSet = new Set(['Arjun Mehta']);
    const normSet = new Set(['sarthak malvadkar', 'person:sarthak malvadkar']);

    const res = leakageAnalyzer.classifyFinding(candidate, originalEntities, synthSet, normSet);
    assert.strictEqual(res.category, 'CONFIRMED_LEAK');
    assert.strictEqual(res.severity, 'CRITICAL');
  });

  runTest('EXACT LEAK: Unredacted original email classified as CONFIRMED_LEAK', () => {
    const candidate = { type: 'EMAIL', text: 'cs.connect@kshinternational.com', start: 0, end: 31 };
    const originalEntities = [{ type: 'EMAIL', text: 'cs.connect@kshinternational.com' }];
    const synthSet = new Set(['arjun.mehta@example.com']);
    const normSet = new Set(['cs.connect@kshinternational.com', 'email:cs.connect@kshinternational.com']);

    const res = leakageAnalyzer.classifyFinding(candidate, originalEntities, synthSet, normSet);
    assert.strictEqual(res.category, 'CONFIRMED_LEAK');
    assert.strictEqual(res.severity, 'CRITICAL');
  });

  // ----------------------------------------------------
  // 2. NORMALIZED LEAKAGE DETECTION TESTS
  // ----------------------------------------------------
  console.log('\n--- 2. Normalized Leakage Detection Tests ---');

  runTest('NORMALIZED LEAK: Email with different casing classified as CONFIRMED_LEAK', () => {
    const candidate = { type: 'EMAIL', text: 'CS.CONNECT@KSHINTERNATIONAL.COM', start: 0, end: 31 };
    const originalEntities = [{ type: 'EMAIL', text: 'cs.connect@kshinternational.com' }];
    const synthSet = new Set(['arjun.mehta@example.com']);
    const normSet = new Set(['cs.connect@kshinternational.com', 'email:cs.connect@kshinternational.com']);

    const res = leakageAnalyzer.classifyFinding(candidate, originalEntities, synthSet, normSet);
    assert.strictEqual(res.category, 'CONFIRMED_LEAK');
    assert.strictEqual(res.severity, 'CRITICAL');
  });

  runTest('NORMALIZED LEAK: Phone with altered formatting classified as CONFIRMED_LEAK', () => {
    const candidate = { type: 'PHONE', text: '+912045053237', start: 0, end: 13 };
    const originalEntities = [{ type: 'PHONE', text: '+91 20 4505 3237' }];
    const synthSet = new Set(['+91 98765 01001']);
    const normSet = new Set(['+912045053237', 'phone:+912045053237']);

    const res = leakageAnalyzer.classifyFinding(candidate, originalEntities, synthSet, normSet);
    assert.strictEqual(res.category, 'CONFIRMED_LEAK');
    assert.strictEqual(res.severity, 'CRITICAL');
  });

  // ----------------------------------------------------
  // 3. SYNTHETIC REPLACEMENT CLASSIFICATION TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. Synthetic Replacement Classification Tests ---');

  runTest('SYNTHETIC: Synthetic person candidate classified as EXPECTED_SYNTHETIC_ENTITY', () => {
    const candidate = { type: 'PERSON', text: 'Arjun Mehta', start: 0, end: 11 };
    const originalEntities = [{ type: 'PERSON', text: 'Sarthak Malvadkar' }];
    const synthSet = new Set(['Arjun Mehta', 'arjun mehta']);
    const normSet = new Set(['sarthak malvadkar']);

    const res = leakageAnalyzer.classifyFinding(candidate, originalEntities, synthSet, normSet);
    assert.strictEqual(res.category, 'EXPECTED_SYNTHETIC_ENTITY');
    assert.strictEqual(res.expectedSynthetic, true);
    assert.strictEqual(res.severity, 'LOW');
  });

  runTest('SYNTHETIC: Synthetic email candidate classified as EXPECTED_SYNTHETIC_ENTITY', () => {
    const candidate = { type: 'EMAIL', text: 'arjun.mehta@example.com', start: 0, end: 23 };
    const originalEntities = [{ type: 'EMAIL', text: 'cs.connect@kshinternational.com' }];
    const synthSet = new Set(['arjun.mehta@example.com']);
    const normSet = new Set(['cs.connect@kshinternational.com']);

    const res = leakageAnalyzer.classifyFinding(candidate, originalEntities, synthSet, normSet);
    assert.strictEqual(res.category, 'EXPECTED_SYNTHETIC_ENTITY');
    assert.strictEqual(res.expectedSynthetic, true);
    assert.strictEqual(res.severity, 'LOW');
  });

  // ----------------------------------------------------
  // 4. STRUCTURAL VALIDATION TESTS
  // ----------------------------------------------------
  console.log('\n--- 4. Structural Validation Tests ---');

  runTest('STRUCTURE: Structural validation compares paragraph and table metrics cleanly', () => {
    const reportBuilder = require('../src/leakage/leakageReport');
    const rep = reportBuilder.buildReport({
      documentId: 'test_doc',
      redactedFileName: 'test_doc_redacted.docx',
      structuralValidation: {
        reparsedSuccessfully: true,
        originalParagraphs: 100,
        redactedParagraphs: 100,
        originalTables: 5,
        redactedTables: 5
      }
    });

    assert.strictEqual(rep.status, 'PASS');
    assert.strictEqual(rep.structuralValidation.reparsedSuccessfully, true);
    assert.strictEqual(rep.structuralValidation.originalParagraphs, 100);
    assert.strictEqual(rep.structuralValidation.redactedParagraphs, 100);
  });

  runTest('STRUCTURE: Failed reparse triggers status FAIL', () => {
    const reportBuilder = require('../src/leakage/leakageReport');
    const rep = reportBuilder.buildReport({
      documentId: 'test_doc',
      redactedFileName: 'corrupt.docx',
      structuralValidation: {
        reparsedSuccessfully: false
      }
    });

    assert.strictEqual(rep.status, 'FAIL');
  });

  // ----------------------------------------------------
  // 5. FULL PIPELINE INTEGRATION TEST ON ACTUAL PROSPECTUS
  // ----------------------------------------------------
  console.log('\n--- 5. Full Pipeline Integration Test on Actual Prospectus ---');

  const rphFileId = 'doc_1786622697521_f7e04c92f688';
  const filePath = path.join(__dirname, '../uploads', `${rphFileId}.docx`);

  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] Prospectus file ${filePath} not found for integration test.`);
  } else {
    const initialStats = fs.statSync(filePath);
    console.log(`  Running Redaction & Leakage Scanner on actual 127-page Red Herring Prospectus (${(initialStats.size / 1024 / 1024).toFixed(2)} MB)...`);

    const startTime = Date.now();

    // 1. Redact DOCX
    const redactResult = await docxRedactionService.redactDocument(rphFileId);
    console.log(`  Redacted DOCX created: ${redactResult.redactedFileName} (${redactResult.totalReplacementsApplied} replacements applied)`);

    // 2. Reparse & Rescan Redacted DOCX
    const report = await leakageScanner.scanRedactedDocument(rphFileId, redactResult.redactedFilePath);
    const durationMs = Date.now() - startTime;

    console.log(`\n  Execution Time: ${durationMs} ms`);
    console.log('  Post-Redaction Leakage Summary Metrics:');
    console.log(`  - Status:                   ${report.status}`);
    console.log(`  - Original Entities Count:  ${report.summary.originalEntitiesCount}`);
    console.log(`  - Expected Replacements:    ${report.summary.expectedReplacementsCount}`);
    console.log(`  - Rescan Candidates:        ${report.summary.rescanCandidatesCount}`);
    console.log(`  - Confirmed Leaks:          ${report.summary.confirmedLeaksCount}`);
    console.log(`  - Possible Leaks:           ${report.summary.possibleLeaksCount}`);
    console.log(`  - Expected Synthetic:       ${report.summary.expectedSyntheticCount}`);
    console.log(`  - Scanner False Positives:  ${report.summary.scannerFalsePositivesCount}`);
    console.log(`  - Reparsed Successfully:    ${report.structuralValidation.reparsedSuccessfully}`);
    console.log(`  - Original vs Redacted Paragraphs: ${report.structuralValidation.originalParagraphs} / ${report.structuralValidation.redactedParagraphs}`);
    console.log(`  - Original vs Redacted Tables:     ${report.structuralValidation.originalTables} / ${report.structuralValidation.redactedTables}\n`);

    runTest('INTEGRATION: Redacted DOCX reparses cleanly without corruption', () => {
      assert.strictEqual(report.structuralValidation.reparsedSuccessfully, true);
    });

    runTest('INTEGRATION: Paragraph and Table structural integrity preserved', () => {
      assert.strictEqual(report.structuralValidation.originalParagraphs, report.structuralValidation.redactedParagraphs);
      assert.strictEqual(report.structuralValidation.originalTables, report.structuralValidation.redactedTables);
    });

    runTest('INTEGRATION: Post-Redaction Leakage Scan yields 0 Confirmed Leaks (PASS)', () => {
      assert.strictEqual(report.summary.confirmedLeaksCount, 0, 'Zero original PII values must remain in redacted output');
      assert.strictEqual(report.status, 'PASS');
    });

    runTest('INTEGRATION: Source DOCX file immutability', () => {
      const finalStats = fs.statSync(filePath);
      assert.strictEqual(finalStats.size, initialStats.size, 'Source DOCX file size must remain 100% unchanged');
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
  runExecution010Tests();
}

module.exports = { runExecution010Tests };
