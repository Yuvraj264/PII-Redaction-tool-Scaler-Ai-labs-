const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');
const documentService = require('../src/services/documentService');
const piiDetectionService = require('../src/services/piiDetectionService');
const docxRedactionService = require('../src/services/docxRedactionService');
const leakageScanner = require('../src/leakage/leakageScanner');
const evaluatorService = require('../src/evaluation/services/evaluatorService');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');
const { SYNTHETIC_9_TYPE_UNITS } = require('../src/evaluation/data/synthetic_9_type_test_fixture');
const app = require('../src/app');

console.log('====================================================');
console.log('  PII REDACTION TOOL — EXECUTION 020B AUDIT RUNNER  ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

(async () => {
  const rootDir = path.join(__dirname, '../..');
  const prospectusPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
  let prospectusDocId = null;

  // --- 1. Data Flow Trace & Ingestion ---
  console.log('--- 1. Data Flow Trace & Ingestion ---');

  runTest('TEST 1: Ingest Prospectus Document & Generate Metadata', () => {
    const mockFile = {
      path: prospectusPath,
      filename: 'doc_1786622697521_f7e04c92f688.docx',
      originalname: 'Red Herring Prospectus.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: fs.statSync(prospectusPath).size
    };
    const docMeta = documentService.processUploadedDocument(mockFile);
    prospectusDocId = docMeta.documentId;
    assert.strictEqual(typeof prospectusDocId, 'string');
  });

  // --- 2. Evaluation Scope & Partial Gold Coverage ---
  console.log('\n--- 2. Evaluation Scope & Partial Gold Coverage ---');

  await runAsyncTest('TEST 2: Partial Gold Coverage & Benchmark Micro Recall (100.0%)', async () => {
    const evalRes = await evaluatorService.runFinalEvaluationAndComparison(prospectusDocId);
    const overall = evalRes.result.evaluationReport.entityLevel.overall;

    assert.strictEqual(overall.truePositives, 8, 'Gold True Positives MUST equal 8');
    assert.strictEqual(overall.falseNegatives, 0, 'Gold False Negatives MUST equal 0');
    assert.strictEqual(overall.recall, 1.0, 'Gold Micro Recall MUST equal 1.0 (100.0%)');
  });

  // --- 3. Pipeline Count Relationship Verification ---
  console.log('\n--- 3. Pipeline Count Relationship Verification ---');

  let detectionRes = null;
  runTest('TEST 3: PII Detector Candidate Spans Count Verification', async () => {
    detectionRes = await piiDetectionService.detectPiiInDocument(prospectusDocId);
    const totalCandidates = detectionRes.summary.totalEntities || detectionRes.summary.totalEntitiesDetected;
    assert.ok(totalCandidates > 500 && totalCandidates < 1000, `Candidate count must be in 500-1000 range (actual: ${totalCandidates})`);
  });

  let redactionRes = null;
  await runAsyncTest('TEST 4: OpenXML Run Replacement Count Verification', async () => {
    redactionRes = await docxRedactionService.redactDocument(prospectusDocId);
    assert.strictEqual(redactionRes.totalReplacementsApplied, 1177);
  });

  await runAsyncTest('TEST 5: Post-Redaction Leakage Rescan Mathematical Relationship (rescanCandidates = synthetic + scannerFPs)', async () => {
    const docMeta = documentService.getDocumentMetadata(prospectusDocId);
    const redactedPath = path.join(path.dirname(docMeta.filePath), `${prospectusDocId}_redacted.docx`);

    const scanRes = await leakageScanner.scanRedactedDocument(prospectusDocId, redactedPath);
    const summary = scanRes.summary;

    assert.strictEqual(scanRes.status, 'PASS');
    assert.strictEqual(summary.confirmedLeaksCount, 0);
    assert.strictEqual(summary.expectedSyntheticCount + summary.scannerFalsePositivesCount, summary.rescanCandidatesCount);
    assert.ok(summary.rescanCandidatesCount > 500, 'rescanCandidatesCount must be > 500');
  });

  // --- 4. Synthetic 9-Category Capability & Regression Tests ---
  console.log('\n--- 4. Synthetic 9-Category Capability & Regression Tests ---');

  runTest('TEST 6: Synthetic 9-Category Detection & Capability Test', () => {
    const detRes = piiDetectionService.detectPiiInUnits(SYNTHETIC_9_TYPE_UNITS, 'synth-doc');
    const entities = detRes.entities || [];

    const foundTypes = new Set(entities.map(e => e.type));
    const expectedTypes = ['PERSON', 'EMAIL', 'PHONE', 'ORGANIZATION', 'ADDRESS', 'DOB', 'SSN', 'CREDIT_CARD', 'IP_ADDRESS'];

    expectedTypes.forEach(t => {
      assert.strictEqual(foundTypes.has(t), true, `Must detect required category: ${t}`);
    });
  });

  runTest('TEST 7: Source Document SHA-256 Immutability Check', () => {
    const hash = goldDatasetValidator.calculateFileHash(prospectusPath);
    assert.strictEqual(hash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  runTest('TEST 8: Full Execution 020A Suite Regression Runner', () => {
    const output = execSync('node server/tests/test_execution_020a.js', { cwd: rootDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('TEST RESULTS SUMMARY: 7 PASSED, 0 FAILED'), true);
  });

  console.log('\n====================================================');
  console.log(`  TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
