const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const organizationDetector = require('../src/detectors/organizationDetector');
const personDetector = require('../src/detectors/personDetector');
const phoneDetector = require('../src/detectors/phoneDetector');
const emailDetector = require('../src/detectors/emailDetector');
const evaluatorService = require('../src/evaluation/services/evaluatorService');
const documentService = require('../src/services/documentService');
const docxRedactionService = require('../src/services/docxRedactionService');
const leakageScanner = require('../src/leakage/leakageScanner');
const app = require('../src/app');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 014 TEST RUNNER   ');
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
  // --- 1. Detector Unit & Regression Tests (MUST DETECT & MUST NOT DETECT) ---
  console.log('--- 1. Detector Unit & Regression Tests ---');

  runTest('TEST 1: MUST DETECT — Quote-Trimming Organization Names', () => {
    const text = 'changed from “Bhandary Metal Extrusion Private Limited” to “KSH International Private Limited” and “KSH International Limited”';
    const matches = organizationDetector.detect(text);

    const bhandary = matches.find(m => m.text === 'Bhandary Metal Extrusion Private Limited');
    assert.ok(bhandary, 'Bhandary Metal Extrusion Private Limited must be detected');
    assert.strictEqual(bhandary.start, 14);

    const kshPvt = matches.find(m => m.text === 'KSH International Private Limited');
    assert.ok(kshPvt, 'KSH International Private Limited must be detected');
    assert.strictEqual(kshPvt.start, 60);

    const kshLtd = matches.find(m => m.text === 'KSH International Limited');
    assert.ok(kshLtd, 'KSH International Limited must be detected');
    assert.strictEqual(kshLtd.start, 100);
  });

  runTest('TEST 2: MUST NOT DETECT — PERSON Section Headings', () => {
    const text = 'BOARD OF DIRECTORS AND KEY MANAGERIAL PERSONNEL';
    const matches = personDetector.detect(text);
    assert.strictEqual(matches.length, 0, 'Section heading MUST NOT be detected as PERSON');
  });

  runTest('TEST 3: MUST DETECT — Genuine Person Name with Title', () => {
    const text = 'Mr. Sarthak Malvadkar serves as Chief Financial Officer.';
    const matches = personDetector.detect(text);
    assert.ok(matches.some(m => m.text.includes('Sarthak Malvadkar')), 'Sarthak Malvadkar MUST be detected');
  });

  runTest('TEST 4: MUST NOT DETECT — Unformatted Numbers without Phone Context', () => {
    const text = 'Financial statement table values: 10 4505 3237 in equity shares.';
    const matches = phoneDetector.detect(text);
    assert.strictEqual(matches.length, 0, 'Table figure MUST NOT be detected as PHONE');
  });

  runTest('TEST 5: MUST DETECT — Genuine Phone Number with Country Code', () => {
    const text = 'For customer queries call +91 22 6807 7100 immediately.';
    const matches = phoneDetector.detect(text);
    assert.ok(matches.some(m => m.text === '+91 22 6807 7100'), '+91 22 6807 7100 MUST be detected');
  });

  runTest('TEST 6: MUST NOT DETECT — Web URL Domains without Email Mailbox', () => {
    const text = 'Official website is www.sebi.gov.in for public reference.';
    const matches = emailDetector.detect(text);
    assert.strictEqual(matches.length, 0, 'URL domain MUST NOT be detected as EMAIL');
  });

  // --- 2. Baseline Comparison & Full Prospectus Evaluation Run ---
  console.log('\n--- 2. Baseline Comparison & Full Prospectus Evaluation Run ---');

  let docId = null;

  await runAsyncTest('TEST 7: Ingest Prospectus DOCX for Improved Evaluation Run', async () => {
    const docxPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
    const mockFile = {
      path: docxPath,
      filename: 'doc_1786622697521_f7e04c92f688.docx',
      originalname: 'Red Herring Prospectus.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: fs.statSync(docxPath).size
    };
    const docMeta = documentService.processUploadedDocument(mockFile);
    docId = docMeta.documentId;
    assert.strictEqual(typeof docId, 'string');
  });

  let evalResult = null;

  await runAsyncTest('TEST 8: Run Evaluation Engine on Improved Detectors', async () => {
    evalResult = await evaluatorService.evaluateDocumentRun(docId);
    assert.strictEqual(evalResult.status, 'PARTIAL_DATASET');
    assert.strictEqual(evalResult.evaluationReport.entityLevel.overall.truePositives, 8);
    assert.strictEqual(evalResult.evaluationReport.entityLevel.overall.falseNegatives, 0);
    assert.strictEqual(evalResult.evaluationReport.entityLevel.overall.recall, 1.0);
  });

  runTest('TEST 9: Per-Type Recall Comparison (ORGANIZATION 100% Recall)', () => {
    const perType = evalResult.evaluationReport.entityLevel.perType;
    assert.strictEqual(perType['ORGANIZATION'].truePositives, 3);
    assert.strictEqual(perType['ORGANIZATION'].falseNegatives, 0);
    assert.strictEqual(perType['ORGANIZATION'].recall, 1.0);
    assert.strictEqual(perType['PERSON'].recall, 1.0);
    assert.strictEqual(perType['EMAIL'].recall, 1.0);
    assert.strictEqual(perType['PHONE'].recall, 1.0);
  });

  // --- 3. Pipeline Integrity & Leakage Scanner Hardening ---
  console.log('\n--- 3. Pipeline Integrity & Leakage Scanner Hardening ---');

  await runAsyncTest('TEST 10: OpenXML Redaction & Post-Redaction Leakage Scan', async () => {
    const redactionRes = await docxRedactionService.redactDocument(docId);
    assert.strictEqual(typeof redactionRes.redactedFilePath, 'string');
    assert.strictEqual(fs.existsSync(redactionRes.redactedFilePath), true);

    const scanRes = await leakageScanner.scanRedactedDocument(docId, redactionRes.redactedFilePath);
    assert.strictEqual(scanRes.status, 'PASS');
    assert.strictEqual(scanRes.summary.confirmedLeaksCount, 0);
  });

  // --- 4. HTTP API Endpoint Integration Test ---
  console.log('\n--- 4. HTTP API Endpoint Integration Test ---');

  await runAsyncTest('TEST 11: HTTP API POST /api/evaluation/run (Improved State)', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const payload = JSON.stringify({ documentId: docId });

    const options = {
      hostname: '127.0.0.1',
      port,
      path: '/api/evaluation/run',
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
    assert.strictEqual(res.body.result.evaluationReport.entityLevel.overall.recall, 1.0);
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
