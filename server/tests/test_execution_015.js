const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const VERSION_CONFIG = require('../src/config/versionConfig');
const evaluatorService = require('../src/evaluation/services/evaluatorService');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');
const evaluationDatasetLoader = require('../src/evaluation/loaders/evaluationDatasetLoader');
const documentService = require('../src/services/documentService');
const docxRedactionService = require('../src/services/docxRedactionService');
const leakageScanner = require('../src/leakage/leakageScanner');
const app = require('../src/app');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 015 TEST RUNNER   ');
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
  // --- 1. Freeze & Source Integrity Verification Tests ---
  console.log('--- 1. Freeze & Source Integrity Verification Tests ---');

  runTest('TEST 1: Frozen Detector Version Identification', () => {
    assert.strictEqual(VERSION_CONFIG.detectorVersion, '1.0.0-final');
    assert.strictEqual(VERSION_CONFIG.evaluationVersion, '1.0');
  });

  const docxPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
  let initialSourceHash = '';

  runTest('TEST 2: Source Document SHA-256 Hash Verification (Pre-Evaluation)', () => {
    assert.strictEqual(fs.existsSync(docxPath), true, 'Source document file must exist');
    initialSourceHash = goldDatasetValidator.calculateFileHash(docxPath);
    assert.strictEqual(initialSourceHash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  runTest('TEST 3: Gold Dataset Schema & Invariant Validation', () => {
    const datasetPath = path.join(__dirname, '../src/evaluation/data/prospectus_gold_dataset.json');
    const { dataset, validation } = evaluationDatasetLoader.loadDataset(datasetPath);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(dataset.document.documentHash, initialSourceHash);
  });

  // --- 2. Final End-to-End Evaluation & Baseline Comparison ---
  console.log('\n--- 2. Final End-to-End Evaluation & Baseline Comparison ---');

  let prospectusDocId = null;

  await runAsyncTest('TEST 4: Ingest Prospectus DOCX for Final Run', async () => {
    const mockFile = {
      path: docxPath,
      filename: 'doc_1786622697521_f7e04c92f688.docx',
      originalname: 'Red Herring Prospectus.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: fs.statSync(docxPath).size
    };
    const docMeta = documentService.processUploadedDocument(mockFile);
    prospectusDocId = docMeta.documentId;
    assert.strictEqual(typeof prospectusDocId, 'string');
  });

  let finalRunResult = null;

  await runAsyncTest('TEST 5: Execute Final Evaluation & Baseline Comparison Run', async () => {
    finalRunResult = await evaluatorService.runFinalEvaluationAndComparison(prospectusDocId);
    assert.strictEqual(finalRunResult.success, true);
    assert.strictEqual(fs.existsSync(finalRunResult.artifacts.jsonPath), true);
    assert.strictEqual(fs.existsSync(finalRunResult.artifacts.mdPath), true);
  });

  runTest('TEST 6: Final Entity & Character Metric Benchmark Verification', () => {
    const rep = finalRunResult.result.evaluationReport;
    assert.strictEqual(rep.entityLevel.overall.truePositives, 8);
    assert.strictEqual(rep.entityLevel.overall.falseNegatives, 0);
    assert.strictEqual(rep.entityLevel.overall.recall, 1.0);
    assert.strictEqual(rep.characterLevel.recall, 1.0);
    assert.strictEqual(rep.characterLevel.characterAccuracy, 0.9055);
  });

  runTest('TEST 7: Per-Type Performance Assertions (Zero False Negatives)', () => {
    const perType = finalRunResult.result.evaluationReport.entityLevel.perType;
    assert.strictEqual(perType['PERSON'].recall, 1.0);
    assert.strictEqual(perType['EMAIL'].recall, 1.0);
    assert.strictEqual(perType['PHONE'].recall, 1.0);
    assert.strictEqual(perType['ORGANIZATION'].recall, 1.0);
  });

  // --- 3. Final Redaction, Leakage Scan & Immutability Verification ---
  console.log('\n--- 3. Final Redaction, Leakage Scan & Immutability Verification ---');

  await runAsyncTest('TEST 8: OpenXML DOCX Redaction Execution', async () => {
    const redactionRes = await docxRedactionService.redactDocument(prospectusDocId);
    assert.strictEqual(typeof redactionRes.redactedFilePath, 'string');
    assert.strictEqual(fs.existsSync(redactionRes.redactedFilePath), true);
  });

  await runAsyncTest('TEST 9: Post-Redaction PII Leakage Scanner Verification (0 Leaks)', async () => {
    const docMeta = documentService.getDocumentMetadata(prospectusDocId);
    const redactedPath = path.join(path.dirname(docMeta.filePath), `${prospectusDocId}_redacted.docx`);

    const scanRes = await leakageScanner.scanRedactedDocument(prospectusDocId, redactedPath);
    assert.strictEqual(scanRes.status, 'PASS');
    assert.strictEqual(scanRes.summary.confirmedLeaksCount, 0);
  });

  runTest('TEST 10: Source Document SHA-256 Immutability Check (Post-Run)', () => {
    const postRunHash = goldDatasetValidator.calculateFileHash(docxPath);
    assert.strictEqual(postRunHash, initialSourceHash, 'Source document hash MUST remain identical BEFORE === AFTER');
  });

  runTest('TEST 11: System Facts & Acceptance Artifacts Verification', () => {
    const readmeFactsPath = path.join(__dirname, '../src/evaluation/reports/readme-facts.md');
    assert.strictEqual(fs.existsSync(readmeFactsPath), true);
    const content = fs.readFileSync(readmeFactsPath, 'utf8');
    assert.strictEqual(content.includes('100.0%'), true);
  });

  // --- 4. API Endpoint Integration Test ---
  console.log('\n--- 4. API Endpoint Integration Test ---');

  await runAsyncTest('TEST 12: HTTP API POST /api/evaluation/final', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const payload = JSON.stringify({ documentId: prospectusDocId });

    const options = {
      hostname: '127.0.0.1',
      port,
      path: '/api/evaluation/final',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const res = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    server.close();

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.result.result.evaluationReport.entityLevel.overall.recall, 1.0);
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
