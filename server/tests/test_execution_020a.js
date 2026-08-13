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
console.log('  PII REDACTION TOOL — EXECUTION 020A AUDIT RUNNER  ');
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

  // --- 1. Ingestion & API Contract Tests ---
  console.log('--- 1. Ingestion & API Contract Tests ---');

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

  await runAsyncTest('TEST 2: UI/API Response Breakdown Mapping Verification (POST /api/documents/:id/detect)', async () => {
    const s1 = http.createServer(app);
    await new Promise(res => s1.listen(0, res));
    const p1 = s1.address().port;

    const res = await new Promise((resolve, reject) => {
      const req = http.request(`http://127.0.0.1:${p1}/api/documents/${prospectusDocId}/detect`, { method: 'POST' }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
      });
      req.on('error', reject);
      req.end();
    });

    s1.close();

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.detection.summary.breakdown.PERSON > 0, 'Breakdown PERSON count must be > 0');
    assert.ok(res.body.detection.summary.breakdown.EMAIL > 0, 'Breakdown EMAIL count must be > 0');
    assert.ok(res.body.detection.summary.breakdown.PHONE > 0, 'Breakdown PHONE count must be > 0');
    assert.ok(res.body.detection.summary.breakdown.ORGANIZATION > 0, 'Breakdown ORGANIZATION count must be > 0');
  });

  // --- 2. Synthetic 9-Category Capability Test ---
  console.log('\n--- 2. Synthetic 9-Category Capability Test ---');

  runTest('TEST 3: Synthetic 9-Category Capability Test (PERSON, EMAIL, PHONE, ORG, ADDRESS, DOB, SSN, CC, IP)', () => {
    const detRes = piiDetectionService.detectPiiInUnits(SYNTHETIC_9_TYPE_UNITS, 'synth-doc');
    const entities = detRes.entities || [];

    const foundTypes = new Set(entities.map(e => e.type));
    const expectedTypes = ['PERSON', 'EMAIL', 'PHONE', 'ORGANIZATION', 'ADDRESS', 'DOB', 'SSN', 'CREDIT_CARD', 'IP_ADDRESS'];

    expectedTypes.forEach(t => {
      assert.strictEqual(foundTypes.has(t), true, `Must detect required PII category: ${t}`);
    });
  });

  // --- 3. Precision Hardening & Benchmark Verification ---
  console.log('\n--- 3. Precision Hardening & Benchmark Verification ---');

  await runAsyncTest('TEST 4: Precision Hardening & Zero Recall Loss Assertion (100.0% Recall)', async () => {
    const evalRes = await evaluatorService.runFinalEvaluationAndComparison(prospectusDocId);
    const overall = evalRes.result.evaluationReport.entityLevel.overall;

    assert.strictEqual(overall.truePositives, 8, 'True Positives MUST be exactly 8');
    assert.strictEqual(overall.falseNegatives, 0, 'False Negatives MUST be exactly 0 (100% Recall)');
    assert.strictEqual(overall.recall, 1.0, 'Micro Recall MUST be 1.0 (100.0%)');
    assert.ok(overall.falsePositives < 1000, `False Positives must be reduced (< 1000, actual: ${overall.falsePositives})`);
  });

  await runAsyncTest('TEST 5: Post-Redaction Leakage Rescan Verification (0 Confirmed Leaks)', async () => {
    const docMeta = documentService.getDocumentMetadata(prospectusDocId);
    const redactedPath = path.join(path.dirname(docMeta.filePath), `${prospectusDocId}_redacted.docx`);

    const scanRes = await leakageScanner.scanRedactedDocument(prospectusDocId, redactedPath);
    assert.strictEqual(scanRes.status, 'PASS');
    assert.strictEqual(scanRes.summary.confirmedLeaksCount, 0);
  });

  runTest('TEST 6: Source Document SHA-256 Immutability Check', () => {
    const hash = goldDatasetValidator.calculateFileHash(prospectusPath);
    assert.strictEqual(hash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  // --- 4. Regression Suite Runner ---
  console.log('\n--- 4. Regression Suite Runner ---');

  runTest('TEST 7: Execution 020 Automated Audit Suite Regression', () => {
    const output = execSync('node server/tests/test_execution_020.js', { cwd: rootDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('TEST RESULTS SUMMARY: 10 PASSED, 0 FAILED'), true);
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
