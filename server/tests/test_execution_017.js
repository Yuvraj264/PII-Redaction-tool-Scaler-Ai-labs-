const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');
const documentService = require('../src/services/documentService');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');
const app = require('../src/app');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 017 TEST RUNNER   ');
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
  // --- 1. Frontend Structure & Architecture Tests ---
  console.log('--- 1. Frontend Structure & Architecture Tests ---');

  const clientDir = path.join(__dirname, '../../client');

  runTest('TEST 1: React Component & API Service File Structure Verification', () => {
    const requiredFiles = [
      'src/App.jsx',
      'src/main.jsx',
      'src/index.css',
      'src/services/apiService.js',
      'src/components/Navbar.jsx',
      'src/components/WorkflowStatus.jsx',
      'src/components/DetectionSummaryCards.jsx',
      'src/components/VerificationCard.jsx',
      'src/components/EvaluationPanel.jsx',
      'src/components/DocumentUploadArea.jsx'
    ];

    requiredFiles.forEach(relPath => {
      const fullPath = path.join(clientDir, relPath);
      assert.strictEqual(fs.existsSync(fullPath), true, `Required file ${relPath} must exist in client/`);
    });
  });

  runTest('TEST 2: Centralized API Service Contract Inspection', () => {
    const apiPath = path.join(clientDir, 'src/services/apiService.js');
    const content = fs.readFileSync(apiPath, 'utf8');

    assert.strictEqual(content.includes('uploadDocument'), true);
    assert.strictEqual(content.includes('detectPii'), true);
    assert.strictEqual(content.includes('redactDocument'), true);
    assert.strictEqual(content.includes('verifyRedaction'), true);
    assert.strictEqual(content.includes('evaluateDocument'), true);
    assert.strictEqual(content.includes('getDownloadUrl'), true);
  });

  runTest('TEST 3: No Client-Side PII Detection or Redaction Audit', () => {
    const srcDir = path.join(clientDir, 'src');
    const checkNoLogic = (dir) => {
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          checkNoLogic(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(content.includes('compromise('), false, `No NER library allowed in ${file}`);
          assert.strictEqual(content.includes('AdmZip'), false, `No ZIP manipulation allowed in ${file}`);
          assert.strictEqual(content.includes('fast-xml-parser'), false, `No XML builder allowed in ${file}`);
        }
      });
    };
    checkNoLogic(srcDir);
  });

  runTest('TEST 4: Zero Raw PII Leakage Check in Frontend Code', () => {
    const srcDir = path.join(clientDir, 'src');
    const checkNoPii = (dir) => {
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          checkNoPii(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.strictEqual(content.includes('sarthak.malvadkar@'), false, `Raw PII string found in ${file}`);
        }
      });
    };
    checkNoPii(srcDir);
  });

  runTest('TEST 5: Zero TypeScript Strict Boundary Guarantee', () => {
    const rootDir = path.join(__dirname, '../..');
    const findTsFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') return;
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

  // --- 2. HTTP Server & Download Endpoint Verification ---
  console.log('\n--- 2. HTTP Server & Download Endpoint Verification ---');

  let server = null;
  let port = 0;

  await runAsyncTest('TEST 6: Server Health Endpoint Check (GET /api/health)', async () => {
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

  let docId = null;

  await runAsyncTest('TEST 7: Full Pipeline Execution & Redacted DOCX Streaming Download', async () => {
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

    // Redact
    const docxRedactionService = require('../src/services/docxRedactionService');
    await docxRedactionService.redactDocument(docId);

    // Download API HTTP test
    const downloadRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/documents/${docId}/download`, (res) => {
        let chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: Buffer.concat(chunks).length
        }));
      }).on('error', reject);
    });

    assert.strictEqual(downloadRes.statusCode, 200);
    assert.ok(downloadRes.contentLength > 0, 'Downloaded DOCX stream length must be > 0');
  });

  runTest('TEST 8: Source Document SHA-256 Immutability Check', () => {
    const docxPath = path.join(__dirname, '../uploads/doc_1786622697521_f7e04c92f688.docx');
    const hash = goldDatasetValidator.calculateFileHash(docxPath);
    assert.strictEqual(hash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  // --- 3. Frontend Production Build & Full Regression Tests ---
  console.log('\n--- 3. Frontend Production Build & Full Regression Tests ---');

  runTest('TEST 9: Vite React Production Build Verification', () => {
    const output = execSync('npx vite build', { cwd: clientDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('built in'), true);
  });

  runTest('TEST 10: Execution 016 Documentation Test Runner Regression', () => {
    const rootDir = path.join(__dirname, '../..');
    const output = execSync('node server/tests/test_execution_016.js', { cwd: rootDir, encoding: 'utf8' });
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
