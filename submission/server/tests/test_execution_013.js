const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const evaluatorService = require('../src/evaluation/services/evaluatorService');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');
const evaluationDatasetLoader = require('../src/evaluation/loaders/evaluationDatasetLoader');
const baselineReportGenerator = require('../src/evaluation/reports/baselineReportGenerator');
const { maskPerson, maskEmail, maskPhone, maskPiiText } = require('../src/evaluation/utils/maskingUtils');
const documentService = require('../src/services/documentService');
const app = require('../src/app');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 013 TEST RUNNER   ');
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
  // --- 1. Gold Dataset & Source Hash Verification Tests ---
  console.log('--- 1. Gold Dataset & Source Hash Verification Tests ---');

  runTest('TEST 1: Prospectus Gold Dataset Invariant Validation', () => {
    const datasetPath = path.join(__dirname, '../src/evaluation/data/prospectus_gold_dataset.json');
    const { dataset, validation } = evaluationDatasetLoader.loadDataset(datasetPath);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.summary.errorCount, 0);
  });

  runTest('TEST 2: Source Hash Mismatch Detection', () => {
    const dataset = {
      datasetVersion: '1.0',
      document: { fileName: 'test.docx', documentHash: 'incorrect_sha256_hash_value_0000000000000000000000000000000000000' },
      annotationPolicy: { matching: 'exact-span-and-type' },
      annotations: []
    };
    const textUnits = [];
    const sourceFilePath = path.join(__dirname, '../src/evaluation/data/prospectus_gold_dataset.json');

    const validation = goldDatasetValidator.validateDataset(dataset, textUnits, sourceFilePath);
    assert.strictEqual(validation.isValid, false);
    assert.strictEqual(validation.errors.some(e => e.includes('hash mismatch')), true);
  });

  // --- 2. Masking Utilities Security Tests ---
  console.log('\n--- 2. Masking Utilities Security Tests ---');

  runTest('TEST 3: PII Text Masking Functions (No Raw PII Output)', () => {
    assert.strictEqual(maskPerson('Sarthak Malvadkar'), 'S****** M********');
    assert.strictEqual(maskEmail('cs.connect@kshinternational.com'), 'c*********@k***************.com');
    assert.strictEqual(maskPhone('+91 20 4505 3237'), '+91 *********3237');
    assert.strictEqual(maskPiiText('Sarthak Malvadkar', 'PERSON'), 'S****** M********');
  });

  // --- 3. Full Prospectus Baseline Evaluation Run ---
  console.log('\n--- 3. Full Prospectus Baseline Evaluation Run ---');

  let prospectusDocId = null;

  await runAsyncTest('TEST 4: Ingest Prospectus DOCX for Baseline Run', async () => {
    const docxPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
    if (!fs.existsSync(docxPath)) {
      throw new Error(`Prospectus file '${docxPath}' does not exist.`);
    }

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

  let baselineResult = null;

  await runAsyncTest('TEST 5: Execute Baseline Evaluation Run', async () => {
    baselineResult = await evaluatorService.runBaselineEvaluation(prospectusDocId);
    assert.strictEqual(baselineResult.success, true);
    assert.strictEqual(fs.existsSync(baselineResult.artifacts.jsonPath), true);
    assert.strictEqual(fs.existsSync(baselineResult.artifacts.mdPath), true);
  });

  runTest('TEST 6: Baseline Result Metrics Verification', () => {
    const rep = baselineResult.result.evaluationReport;
    assert.strictEqual(typeof rep.entityLevel.overall.precision, 'number');
    assert.strictEqual(typeof rep.entityLevel.overall.recall, 'number');
    assert.strictEqual(typeof rep.entityLevel.overall.f1, 'number');
    assert.strictEqual(typeof rep.characterLevel.characterAccuracy, 'number');
    assert.strictEqual(baselineResult.result.scope.coverage, 'PARTIAL');
  });

  runTest('TEST 7: Per-Type Metrics & Zero Handling', () => {
    const perType = baselineResult.result.evaluationReport.entityLevel.perType;
    assert.strictEqual(perType['PERSON'].status, 'EVALUATED');
    assert.strictEqual(perType['EMAIL'].status, 'EVALUATED');
    assert.strictEqual(perType['ORGANIZATION'].status, 'EVALUATED');
    assert.strictEqual(perType['PHONE'].status, 'EVALUATED');
    assert.strictEqual(perType['SSN'].status, 'NO_GOLD_OCCURRENCES');
    assert.strictEqual(perType['SSN'].precision, 'N/A');
  });

  runTest('TEST 8: Error Classification Breakdown', () => {
    const errs = baselineResult.result.evaluationReport.errorBreakdown;
    assert.strictEqual(typeof errs.falsePositives.total, 'number');
    assert.strictEqual(typeof errs.falseNegatives.total, 'number');
    assert.strictEqual(typeof errs.wrongType.total, 'number');
    assert.strictEqual(typeof errs.partialMatches.total, 'number');
  });

  runTest('TEST 9: Detector Contribution & Quality Gate Status', () => {
    const jsonPath = baselineResult.artifacts.jsonPath;
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.strictEqual(typeof jsonContent.detectorBreakdown, 'object');
    assert.strictEqual(['NEEDS_TUNING', 'READY_FOR_TUNING', 'PARTIAL_DATASET_NEEDS_EXPANSION'].includes(jsonContent.qualityGateStatus), true);
  });

  // --- 4. API Endpoint Integration Test ---
  console.log('\n--- 4. API Endpoint Integration Test ---');

  await runAsyncTest('TEST 10: HTTP API POST /api/evaluation/baseline', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const payload = JSON.stringify({
      documentId: prospectusDocId
    });

    const options = {
      hostname: '127.0.0.1',
      port,
      path: '/api/evaluation/baseline',
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
    assert.strictEqual(res.body.result.result.scope.coverage, 'PARTIAL');
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
