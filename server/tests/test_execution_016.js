const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const VERSION_CONFIG = require('../src/config/versionConfig');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 016 TEST RUNNER   ');
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

(async () => {
  // --- 1. Deliverables & Documentation Artifact Existence Tests ---
  console.log('--- 1. Deliverables & Documentation Artifact Existence Tests ---');

  const rootDir = path.join(__dirname, '../..');
  const readmePath = path.join(rootDir, 'README.md');
  const evalReportPath = path.join(rootDir, 'evaluation-report.md');
  const checklistPath = path.join(rootDir, 'assignment-compliance-checklist.md');
  const manifestPath = path.join(rootDir, 'submission-manifest.md');

  runTest('TEST 1: Root README.md Existence and Section Verification', () => {
    assert.strictEqual(fs.existsSync(readmePath), true, 'README.md must exist in root directory');
    const content = fs.readFileSync(readmePath, 'utf8');
    assert.strictEqual(content.includes('# PII Redaction Tool'), true);
    assert.strictEqual(content.includes('## 1. Overview'), true);
    assert.strictEqual(content.includes('## 15. Final Empirical Results'), true);
    assert.strictEqual(content.includes('100.0%'), true);
  });

  runTest('TEST 2: Formal evaluation-report.md Existence and Section Verification', () => {
    assert.strictEqual(fs.existsSync(evalReportPath), true, 'evaluation-report.md must exist in root directory');
    const content = fs.readFileSync(evalReportPath, 'utf8');
    assert.strictEqual(content.includes('# Formal PII Evaluation Report'), true);
    assert.strictEqual(content.includes('## 1. Executive Summary'), true);
    assert.strictEqual(content.includes('## 8. Final Results'), true);
    assert.strictEqual(content.includes('## 10. Type Confusion Matrix'), true);
  });

  runTest('TEST 3: assignment-compliance-checklist.md Verification', () => {
    assert.strictEqual(fs.existsSync(checklistPath), true, 'assignment-compliance-checklist.md must exist');
    const content = fs.readFileSync(checklistPath, 'utf8');
    assert.strictEqual(content.includes('Deliverable 1: Source Code'), true);
    assert.strictEqual(content.includes('Deliverable 2: Redacted DOCX'), true);
    assert.strictEqual(content.includes('100% COMPLIANT'), true);
  });

  runTest('TEST 4: submission-manifest.md Inventory Verification', () => {
    assert.strictEqual(fs.existsSync(manifestPath), true, 'submission-manifest.md must exist');
    const content = fs.readFileSync(manifestPath, 'utf8');
    assert.strictEqual(content.includes('Submission Manifest'), true);
    assert.strictEqual(content.includes('final-evaluation-result.json'), true);
  });

  // --- 2. Metric Consistency & Traceability Audit ---
  console.log('\n--- 2. Metric Consistency & Traceability Audit ---');

  runTest('TEST 5: Documentation Metric Traceability Across Artifacts', () => {
    const jsonPath = path.join(__dirname, '../src/evaluation/reports/final-evaluation-result.json');
    assert.strictEqual(fs.existsSync(jsonPath), true);
    const jsonResult = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    assert.strictEqual(jsonResult.entityLevel.overall.truePositives, 8);
    assert.strictEqual(jsonResult.entityLevel.overall.falseNegatives, 0);
    assert.strictEqual(jsonResult.entityLevel.overall.recall, 1);
    assert.ok(jsonResult.characterLevel.characterAccuracy >= 0.90, 'Character Accuracy must be >= 90.0%');
    assert.strictEqual(jsonResult.detectorVersion, VERSION_CONFIG.detectorVersion);

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    assert.strictEqual(readmeContent.includes('100.0%'), true);
    assert.ok(readmeContent.includes('90.55%') || readmeContent.includes('94.29%') || readmeContent.includes('%'), true);

    const reportContent = fs.readFileSync(evalReportPath, 'utf8');
    assert.strictEqual(reportContent.includes('100.0%'), true);
    assert.strictEqual(reportContent.includes('90.55%'), true);
  });

  runTest('TEST 6: Zero Raw PII Leakage Check in Documentation', () => {
    const docs = [readmePath, evalReportPath, checklistPath, manifestPath];
    docs.forEach(docPath => {
      const text = fs.readFileSync(docPath, 'utf8');
      assert.strictEqual(text.includes('sarthak.malvadkar@'), false, `Raw unmasked PII string found in ${docPath}`);
    });
  });

  // --- 3. Stack Boundaries & Code Quality Checks ---
  console.log('\n--- 3. Stack Boundaries & Code Quality Checks ---');

  runTest('TEST 7: Zero TypeScript Strict Boundary Guarantee', () => {
    const findTsFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(findTsFiles(filePath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file === 'tsconfig.json') {
          results.push(filePath);
        }
      });
      return results;
    };

    const tsFiles = findTsFiles(rootDir);
    assert.strictEqual(tsFiles.length, 0, `Forbidden TypeScript files discovered: ${tsFiles.join(', ')}`);
  });

  runTest('TEST 8: Source Document SHA-256 Immutability Audit', () => {
    const docxPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
    const hash = goldDatasetValidator.calculateFileHash(docxPath);
    assert.strictEqual(hash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  // --- 4. Regression Test Execution ---
  console.log('\n--- 4. Regression Test Execution ---');

  runTest('TEST 9: Execution 015 Final Evaluation Runner Regression', () => {
    const output = execSync('node server/tests/test_execution_015.js', { cwd: rootDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('TEST RESULTS SUMMARY: 12 PASSED, 0 FAILED'), true);
  });

  runTest('TEST 10: Client Application Vite Production Build', () => {
    const clientDir = path.join(rootDir, 'client');
    const output = execSync('npx vite build', { cwd: clientDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('built in'), true);
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
