const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');
const documentService = require('../src/services/documentService');
const docxParserService = require('../src/services/docxParserService');
const piiDetectionService = require('../src/services/piiDetectionService');
const replacementService = require('../src/replacement/replacementService');
const docxRedactionService = require('../src/services/docxRedactionService');
const leakageScanner = require('../src/leakage/leakageScanner');
const evaluatorService = require('../src/evaluation/services/evaluatorService');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');
const app = require('../src/app');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 018 TEST RUNNER   ');
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
  // --- 1. Environment & Server Health Tests ---
  console.log('--- 1. Environment & Server Health Tests ---');

  runTest('TEST 1: Node.js Runtime & npm Environment Audit', () => {
    assert.strictEqual(process.version.startsWith('v'), true);
    const nodeMajor = parseInt(process.version.slice(1).split('.')[0], 10);
    assert.ok(nodeMajor >= 18, 'Node.js version must be 18+');
  });

  let server = null;
  let port = 0;

  await runAsyncTest('TEST 2: Server Startup & GET /api/health Response Check', async () => {
    server = http.createServer(app);
    await new Promise(res => server.listen(0, res));
    port = server.address().port;

    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
      }).on('error', reject);
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  // --- 2. End-to-End Pipeline & Structural Tests ---
  console.log('\n--- 2. End-to-End Pipeline & Structural Tests ---');

  const prospectusPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
  let prospectusDocId = null;

  await runAsyncTest('TEST 3: Ingest Prospectus DOCX Document', async () => {
    assert.strictEqual(fs.existsSync(prospectusPath), true);
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

  await runAsyncTest('TEST 4: OpenXML DOCX Structural Paragraph & Table Cell Parsing', async () => {
    const docMeta = documentService.getDocumentMetadata(prospectusDocId);
    const parsedDoc = await docxParserService.parseDocument(docMeta.filePath, prospectusDocId);

    assert.ok(parsedDoc.content.length > 100, 'Must extract over 100 text units');
    assert.ok(parsedDoc.metrics.paragraphCount > 500, 'Must extract over 500 paragraphs');
  });

  await runAsyncTest('TEST 5: Full 9 PII Detector Execution', async () => {
    const detectionResult = await piiDetectionService.detectPiiInDocument(prospectusDocId);
    const totalCount = detectionResult.summary.totalEntities || detectionResult.summary.totalEntitiesDetected || 0;
    assert.ok(totalCount > 500, 'Total entities detected must be > 500');
    assert.ok(detectionResult.summary['PERSON'] > 0);
    assert.ok(detectionResult.summary['EMAIL'] > 0);
    assert.ok(detectionResult.summary['PHONE'] > 0);
    assert.ok(detectionResult.summary['ORGANIZATION'] > 0);
  });

  runTest('TEST 6: Repeated PII Entity Canonical Replacement Consistency', async () => {
    const plan = await replacementService.generateReplacementPlan(prospectusDocId);
    assert.ok(plan.unitPlans.length > 0);

    const emailReplacements = new Map();
    plan.unitPlans.forEach(up => {
      up.replacements.forEach(r => {
        if (r.type === 'EMAIL') {
          if (emailReplacements.has(r.originalText)) {
            assert.strictEqual(
              emailReplacements.get(r.originalText),
              r.replacementText,
              'Repeated occurrence of same email MUST map to identical synthetic replacement'
            );
          } else {
            emailReplacements.set(r.originalText, r.replacementText);
          }
        }
      });
    });
  });

  await runAsyncTest('TEST 7: OpenXML DOCX Redaction Execution & File Output Validation', async () => {
    const redactionRes = await docxRedactionService.redactDocument(prospectusDocId);
    assert.strictEqual(typeof redactionRes.redactedFilePath, 'string');
    assert.strictEqual(fs.existsSync(redactionRes.redactedFilePath), true);
    assert.ok(fs.statSync(redactionRes.redactedFilePath).size > 100000);
  });

  await runAsyncTest('TEST 8: Post-Redaction PII Leakage Scanner Verification (0 Leaks)', async () => {
    const docMeta = documentService.getDocumentMetadata(prospectusDocId);
    const redactedPath = path.join(path.dirname(docMeta.filePath), `${prospectusDocId}_redacted.docx`);

    const scanRes = await leakageScanner.scanRedactedDocument(prospectusDocId, redactedPath);
    assert.strictEqual(scanRes.status, 'PASS');
    assert.strictEqual(scanRes.summary.confirmedLeaksCount, 0);
  });

  await runAsyncTest('TEST 9: Formal Evaluation Metric Benchmark Verification', async () => {
    const evalRes = await evaluatorService.runFinalEvaluationAndComparison(prospectusDocId);
    const rep = evalRes.result.evaluationReport;
    assert.strictEqual(rep.entityLevel.overall.truePositives, 8);
    assert.strictEqual(rep.entityLevel.overall.falseNegatives, 0);
    assert.strictEqual(rep.entityLevel.overall.recall, 1.0);
  });

  // --- 3. Security Hardening & Immutability Audits ---
  console.log('\n--- 3. Security Hardening & Immutability Audits ---');

  await runAsyncTest('TEST 10: Path Traversal Attack Rejection Audit (../../file)', async () => {
    const maliciousDocId = '../../uploads/doc_1786622697521_f7e04c92f688';

    const testServer = http.createServer(app);
    await new Promise(res => testServer.listen(0, res));
    const testPort = testServer.address().port;

    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/api/documents/${encodeURIComponent(maliciousDocId)}/download`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      }).on('error', reject);
    });

    testServer.close();

    assert.ok(res.statusCode === 400 || res.statusCode === 404, 'Path traversal attack MUST be rejected with HTTP 400/404');
    assert.strictEqual(res.body.includes('etc/passwd'), false, 'Response MUST NOT expose system files');
  });

  runTest('TEST 11: Source Document SHA-256 Immutability Check', () => {
    const postRunHash = goldDatasetValidator.calculateFileHash(prospectusPath);
    assert.strictEqual(postRunHash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  // --- 4. Regression Test Suite Integration ---
  console.log('\n--- 4. Regression Test Suite Integration ---');

  runTest('TEST 12: Execution 017 Frontend & Integration Test Runner Regression', () => {
    const rootDir = path.join(__dirname, '../..');
    const output = execSync('node server/tests/test_execution_017.js', { cwd: rootDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('TEST RESULTS SUMMARY: 10 PASSED, 0 FAILED'), true);
  });

  if (server) server.close();

  console.log('\n====================================================');
  console.log(`  TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
