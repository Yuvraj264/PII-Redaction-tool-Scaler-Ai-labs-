const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 019 TEST RUNNER   ');
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
  const submissionDir = path.join(rootDir, 'submission');

  // --- 1. QA Gate & Deliverable Audits ---
  console.log('--- 1. QA Gate & Deliverable Audits ---');

  runTest('TEST 1: QA Gate Status Verification (QA_PASS)', () => {
    const qaPath = path.join(rootDir, 'qa-results.md');
    assert.strictEqual(fs.existsSync(qaPath), true);
    const content = fs.readFileSync(qaPath, 'utf8');
    assert.strictEqual(content.includes('QA_PASS'), true);
  });

  runTest('TEST 2: Submission Deliverables Inventory Check', () => {
    const deliverables = [
      'README.md',
      'evaluation-report.md',
      'assignment-compliance-checklist.md',
      'submission-manifest.md',
      'FINAL-SUBMISSION-MANIFEST.md',
      'output/final-redacted-document.docx',
      'output/doc_1786622697521_f7e04c92f688_redacted.docx',
      'evaluation/final-evaluation-result.json',
      'client/package.json',
      'server/package.json'
    ];

    deliverables.forEach(file => {
      const fullPath = path.join(submissionDir, file);
      assert.strictEqual(fs.existsSync(fullPath), true, `Missing deliverable in submission/: ${file}`);
    });
  });

  runTest('TEST 3: Original Unredacted Prospectus Exclusion Audit', () => {
    const scanDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        const fp = path.join(dir, f);
        if (fs.statSync(fp).isDirectory()) {
          scanDir(fp);
        } else {
          assert.strictEqual(f.toLowerCase().includes('red herring prospectus.docx'), false, `Original DOCX must not be in submission: ${fp}`);
        }
      });
    };
    scanDir(submissionDir);
  });

  runTest('TEST 4: Secret & .env File Exclusion Audit', () => {
    const scanNoSecrets = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        if (f === '.env' || f.endsWith('.env.local') || f.endsWith('.env.production')) {
          assert.fail(`Secret file ${f} found in submission/!`);
        }
        const fp = path.join(dir, f);
        if (fs.statSync(fp).isDirectory()) {
          scanNoSecrets(fp);
        }
      });
    };
    scanNoSecrets(submissionDir);
    assert.strictEqual(fs.existsSync(path.join(submissionDir, 'server/.env.example')), true, '.env.example template must exist');
  });

  runTest('TEST 5: node_modules & Build Cache Exclusion Audit', () => {
    assert.strictEqual(fs.existsSync(path.join(submissionDir, 'node_modules')), false, 'node_modules must not be in submission root');
    assert.strictEqual(fs.existsSync(path.join(submissionDir, 'client/node_modules')), false, 'node_modules must not be in submission/client');
    assert.strictEqual(fs.existsSync(path.join(submissionDir, 'server/node_modules')), false, 'node_modules must not be in submission/server');
  });

  // --- 2. Metric & Documentation Consistency Audits ---
  console.log('\n--- 2. Metric & Documentation Consistency Audits ---');

  runTest('TEST 6: Metric Consistency Across README, Report & Evaluation JSON', () => {
    const jsonPath = path.join(submissionDir, 'evaluation/final-evaluation-result.json');
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const entityLevel = jsonContent.entityLevel || jsonContent.evaluationReport?.entityLevel || {};
    const recall = entityLevel.overall?.recall;
    assert.strictEqual(recall, 1, 'Entity micro recall must be 1 (100.0%)');

    const readmeContent = fs.readFileSync(path.join(submissionDir, 'README.md'), 'utf8');
    assert.strictEqual(readmeContent.includes('100.0%'), true);

    const reportContent = fs.readFileSync(path.join(submissionDir, 'evaluation-report.md'), 'utf8');
    assert.strictEqual(reportContent.includes('100.0%'), true);
  });

  runTest('TEST 7: Zero Raw PII Exposure Check in Submission Code', () => {
    const checkNoPii = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        const fp = path.join(dir, f);
        if (fs.statSync(fp).isDirectory()) {
          checkNoPii(fp);
        } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
          const content = fs.readFileSync(fp, 'utf8');
          assert.strictEqual(content.includes('sarthak.malvadkar@'), false, `Raw PII string in ${fp}`);
        }
      });
    };
    checkNoPii(path.join(submissionDir, 'client/src'));
  });

  // --- 3. ZIP Archive Creation & Clean Extraction Simulation ---
  console.log('\n--- 3. ZIP Archive Creation & Clean Extraction Simulation ---');

  runTest('TEST 8: Create Submission ZIP Archive (PII-Redaction-Tool-Submission.zip)', () => {
    const zipPath = path.join(rootDir, 'PII-Redaction-Tool-Submission.zip');
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    execSync(`zip -r "${zipPath}" submission`, { cwd: rootDir });
    assert.strictEqual(fs.existsSync(zipPath), true);
    assert.ok(fs.statSync(zipPath).size > 100000);
  });

  runTest('TEST 9: Clean Archive Extraction & Content Audit', () => {
    const zipPath = path.join(rootDir, 'PII-Redaction-Tool-Submission.zip');
    const extractDir = path.join(rootDir, 'scratch/test_extraction');

    if (fs.existsSync(extractDir)) {
      execSync(`rm -rf "${extractDir}"`);
    }
    fs.mkdirSync(extractDir, { recursive: true });

    execSync(`unzip -q "${zipPath}" -d "${extractDir}"`);
    const extractedSubmission = path.join(extractDir, 'submission');
    assert.strictEqual(fs.existsSync(extractedSubmission), true);
    assert.strictEqual(fs.existsSync(path.join(extractedSubmission, 'README.md')), true);
    assert.strictEqual(fs.existsSync(path.join(extractedSubmission, 'FINAL-SUBMISSION-MANIFEST.md')), true);

    // Clean up
    execSync(`rm -rf "${extractDir}"`);
  });

  runTest('TEST 10: Source Document SHA-256 Immutability Check', () => {
    const prospectusPath = path.join(rootDir, 'server/uploads/doc_1786622697521_f7e04c92f688.docx');
    const hash = goldDatasetValidator.calculateFileHash(prospectusPath);
    assert.strictEqual(hash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  // --- 4. Complete Regression Suite Verification ---
  console.log('\n--- 4. Complete Regression Suite Verification ---');

  runTest('TEST 11: Execution 018 Automated Test Suite Regression', () => {
    const output = execSync('node server/tests/test_execution_018.js', { cwd: rootDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('TEST RESULTS SUMMARY: 12 PASSED, 0 FAILED'), true);
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
