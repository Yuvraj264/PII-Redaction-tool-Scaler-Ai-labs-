const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');
const { DOMParser } = require('@xmldom/xmldom');
const documentService = require('../src/services/documentService');
const docxRedactionService = require('../src/services/docxRedactionService');
const leakageScanner = require('../src/leakage/leakageScanner');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');
const app = require('../src/app');

console.log('====================================================');
console.log('  PII REDACTION TOOL — EXECUTION 020C AUDIT RUNNER  ');
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

  // --- 1. Ingestion & Redaction Execution ---
  console.log('--- 1. Ingestion & Redaction Execution ---');

  await runAsyncTest('TEST 1: Ingest Document & Generate Redacted DOCX File', async () => {
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

  // --- 2. HTTP Endpoint & Binary Download Tests ---
  console.log('\n--- 2. HTTP Endpoint & Binary Download Tests ---');

  let downloadedBuffer = null;
  let downloadedHeaders = null;

  await runAsyncTest('TEST 2: HTTP Download Endpoint Status & MIME Headers (GET /api/documents/:id/download)', async () => {
    const s1 = http.createServer(app);
    await new Promise(res => s1.listen(0, res));
    const port = s1.address().port;

    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/documents/${prospectusDocId}/download`, (response) => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks)
        }));
      }).on('error', reject);
    });

    s1.close();

    downloadedBuffer = res.body;
    downloadedHeaders = res.headers;

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.ok(res.headers['content-disposition'].includes('.docx'));
  });

  runTest('TEST 3: Downloaded Binary ZIP Magic Header Signature Check (PK\\x03\\x04)', () => {
    assert.ok(downloadedBuffer && downloadedBuffer.length > 4);
    assert.strictEqual(downloadedBuffer[0], 0x50);
    assert.strictEqual(downloadedBuffer[1], 0x4B);
    assert.strictEqual(downloadedBuffer[2], 0x03);
    assert.strictEqual(downloadedBuffer[3], 0x04);
  });

  runTest('TEST 4: OpenXML Package Structure Audit ([Content_Types].xml & word/document.xml)', () => {
    const zip = new AdmZip(downloadedBuffer);
    assert.ok(zip.getEntry('[Content_Types].xml') !== null, 'Must contain [Content_Types].xml');
    assert.ok(zip.getEntry('word/document.xml') !== null, 'Must contain word/document.xml');
  });

  runTest('TEST 5: OpenXML XML DOM Parsing & Non-Empty Paragraph Validation', () => {
    const zip = new AdmZip(downloadedBuffer);
    const docEntry = zip.getEntry('word/document.xml');
    const xmlText = docEntry.getData().toString('utf8');

    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    assert.strictEqual(doc.documentElement.nodeName, 'w:document');

    const paragraphs = doc.getElementsByTagName('w:p');
    assert.ok(paragraphs.length > 500, 'Must contain over 500 w:p paragraph nodes');
  });

  // --- 3. Leakage Rescan & Immutability Audits ---
  console.log('\n--- 3. Leakage Rescan & Immutability Audits ---');

  await runAsyncTest('TEST 6: Post-Redaction Leakage Rescan Verification on Downloaded DOCX (0 Confirmed Leaks)', async () => {
    const tempDownloadedPath = path.join(__dirname, '../uploads/temp_downloaded_audit.docx');
    fs.writeFileSync(tempDownloadedPath, downloadedBuffer);

    const scanRes = await leakageScanner.scanRedactedDocument(prospectusDocId, tempDownloadedPath);
    if (fs.existsSync(tempDownloadedPath)) fs.unlinkSync(tempDownloadedPath);

    assert.strictEqual(scanRes.status, 'PASS');
    assert.strictEqual(scanRes.summary.confirmedLeaksCount, 0);
  });

  runTest('TEST 7: Source Document SHA-256 Immutability Check', () => {
    const hash = goldDatasetValidator.calculateFileHash(prospectusPath);
    assert.strictEqual(hash, '8b5c93f7642d659e64b51be9f6172c86c2825417f376ca1800ed331515e6f929');
  });

  // --- 4. Regression Suite Runner ---
  console.log('\n--- 4. Regression Suite Runner ---');

  runTest('TEST 8: Full Execution 020B Suite Regression Runner', () => {
    const output = execSync('node server/tests/test_execution_020b.js', { cwd: rootDir, encoding: 'utf8' });
    assert.strictEqual(output.includes('TEST RESULTS SUMMARY: 8 PASSED, 0 FAILED'), true);
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
