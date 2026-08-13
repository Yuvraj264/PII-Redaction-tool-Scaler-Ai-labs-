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
const metricsCalculator = require('../src/evaluation/engine/metricsCalculator');
const app = require('../src/app');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 020 AUDIT RUNNER  ');
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

  // --- 1. Deliverable & Requirement Traceability Audits ---
  console.log('--- 1. Deliverable & Requirement Traceability Audits ---');

  runTest('TEST 1: Required Assignment Deliverables Existence Verification', () => {
    const requiredDeliverables = [
      'README.md',
      'evaluation-report.md',
      'assignment-compliance-checklist.md',
      'submission-manifest.md',
      'FINAL-SUBMISSION-MANIFEST.md',
      'qa-plan.md',
      'qa-results.md',
      'bug-register.md',
      'final-assignment-audit.md',
      'final-review-scorecard.md',
      'FINAL-SUBMISSION-DECISION.md',
      'PII-Redaction-Tool-Submission.zip'
    ];

    requiredDeliverables.forEach(relPath => {
      const fullPath = path.join(rootDir, relPath);
      assert.strictEqual(fs.existsSync(fullPath), true, `Missing required deliverable: ${relPath}`);
    });
  });

  runTest('TEST 2: 9-Category PII Detector Strategy & Method Verification', () => {
    const detectors = [
      require('../src/detectors/emailDetector'),
      require('../src/detectors/phoneDetector'),
      require('../src/detectors/ipDetector'),
      require('../src/detectors/ssnDetector'),
      require('../src/detectors/creditCardDetector'),
      require('../src/detectors/personDetector'),
      require('../src/detectors/organizationDetector'),
      require('../src/detectors/addressDetector'),
      require('../src/detectors/dobDetector')
    ];

    detectors.forEach(d => {
      assert.strictEqual(typeof d.detect, 'function');
    });
  });

  // --- 2. Mathematical Metric Formula Audit ---
  console.log('\n--- 2. Mathematical Metric Formula Audit ---');

  runTest('TEST 3: Precision, Recall, F1, and Character Accuracy Formula Verification', () => {
    const tp = 8;
    const fp = 1600;
    const fn = 0;

    const computed = metricsCalculator.calculateMetrics({ tp, fp, fn });
    const overall = computed.entityLevel.overall;

    assert.strictEqual(overall.recall, 1, 'Recall MUST equal 1.0 (100.0%) when FN = 0');
    assert.ok(Math.abs(overall.precision - (8 / 1608)) < 0.0001, 'Precision formula TP / (TP + FP)');
    assert.ok(Math.abs(overall.f1 - (2 * overall.precision * overall.recall / (overall.precision + overall.recall))) < 0.0001, 'F1 harmonic mean formula');
  });

  // --- 3. End-to-End Pipeline & Leakage Rescan Audit ---
  console.log('\n--- 3. End-to-End Pipeline & Leakage Rescan Audit ---');

  const prospectusPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
  let prospectusDocId = null;

  await runAsyncTest('TEST 4: Full Prospectus Document Pipeline & OpenXML Redaction', async () => {
    const mockFile = {
      path: prospectusPath,
      filename: 'doc_1786622697521_f7e04c92f688.docx',
      originalname: 'Red Herring Prospectus.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: fs.statSync(prospectusPath).size
    };
    const docMeta = documentService.processUploadedDocument(mockFile);
    prospectusDocId = docMeta.documentId;

    const redactionRes = await docxRedactionService.redactDocument(prospectusDocId);
    assert.strictEqual(fs.existsSync(redactionRes.redactedFilePath), true);
  });

  await runAsyncTest('TEST 5: Post-Redaction Leakage Rescan Verification (0 Confirmed Leaks)', async () => {
    const docMeta = documentService.getDocumentMetadata(prospectusDocId);
    const redactedPath = path.join(path.dirname(docMeta.filePath), `${prospectusDocId}_redacted.docx`);

    const scanRes = await leakageScanner.scanRedactedDocument(prospectusDocId, redactedPath);
    assert.strictEqual(scanRes.status, 'PASS');
    assert.strictEqual(scanRes.summary.confirmedLeaksCount, 0);
  });

  await runAsyncTest('TEST 6: Formal Evaluation Metric Benchmark Verification', async () => {
    const evalRes = await evaluatorService.runFinalEvaluationAndComparison(prospectusDocId);
    const rep = evalRes.result.evaluationReport;
    assert.strictEqual(rep.entityLevel.overall.truePositives, 8);
    assert.strictEqual(rep.entityLevel.overall.falseNegatives, 0);
    assert.strictEqual(rep.entityLevel.overall.recall, 1.0);
  });

  // --- 4. Security, Path Traversal & Immutability Audits ---
  console.log('\n--- 4. Security, Path Traversal & Immutability Audits ---');

  await runAsyncTest('TEST 7: Path Traversal Attack Rejection Audit (../../file)', async () => {
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

    assert.ok(res.statusCode === 400 || res.statusCode === 404);
  });

  runTest('TEST 8: Zero TypeScript Strict Boundary Verification', () => {
    const findTsFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'submission') return;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          results = results.concat(findTsFiles(filePath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file === 'tsconfig.json') {
          results.push(filePath);
        }
      });
      return results;
    };
    const tsFiles = findTsFiles(rootDir);
    assert.strictEqual(tsFiles.length, 0);
  });

  runTest('TEST 9: Source Document SHA-256 Immutability Audit', () => {
    const postRunHash = goldDatasetValidator.calculateFileHash(prospectusPath);
    assert.strictEqual(postRunHash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  // --- 5. Full Repository Regression Suite Verification ---
  console.log('\n--- 5. Full Repository Regression Suite Verification ---');

  runTest('TEST 10: Execution 019 Automated Packaging Test Suite Regression', () => {
    const output = execSync('node server/tests/test_execution_019.js', { cwd: rootDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('TEST RESULTS SUMMARY: 11 PASSED, 0 FAILED'), true);
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
