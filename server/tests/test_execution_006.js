const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Detectors
const personDetector = require('../src/detectors/personDetector');
const organizationDetector = require('../src/detectors/organizationDetector');
const addressDetector = require('../src/detectors/addressDetector');
const dobDetector = require('../src/detectors/dobDetector');
const emailDetector = require('../src/detectors/emailDetector');
const phoneDetector = require('../src/detectors/phoneDetector');
const ipDetector = require('../src/detectors/ipDetector');
const ssnDetector = require('../src/detectors/ssnDetector');
const creditCardDetector = require('../src/detectors/creditCardDetector');

// Services
const piiDetectionService = require('../src/services/piiDetectionService');
const documentService = require('../src/services/documentService');

async function runExecution006Tests() {
  console.log('====================================================');
  console.log('   PII REDACTION TOOL — EXECUTION 006 TEST RUNNER  ');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function runTest(testName, testFn) {
    try {
      testFn();
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } catch (err) {
      console.error(`  [FAIL] ${testName}: ${err.message}`);
      failedTests++;
    }
  }

  // ----------------------------------------------------
  // 1. PERSON DETECTOR UNIT TESTS
  // ----------------------------------------------------
  console.log('--- 1. PERSON Detector Unit Tests ---');

  runTest('PERSON: Full name without title', () => {
    const matches = personDetector.detect('Company Secretary and Compliance Officer is Sarthak Malvadkar.');
    assert.strictEqual(matches.length, 1, 'Should detect 1 person name');
    assert.strictEqual(matches[0].text, 'Sarthak Malvadkar');
    assert.strictEqual(matches[0].type, 'PERSON');
    assert.strictEqual(matches[0].text, 'Company Secretary and Compliance Officer is Sarthak Malvadkar.'.substring(matches[0].start, matches[0].end));
  });

  runTest('PERSON: Person with honorific title', () => {
    const text = 'Notice is hereby given by Mr. Kushal Subbayya Hegde to all shareholders.';
    const matches = personDetector.detect(text);
    assert.ok(matches.length >= 1, 'Should detect person with honorific');
    assert.ok(matches.some(m => m.text.includes('Kushal Subbayya Hegde')), 'Should include Kushal Subbayya Hegde');
  });

  runTest('PERSON: Reject organization-like phrase', () => {
    const matches = personDetector.detect('KSH International Limited announced the offer.');
    const personMatches = matches.filter(m => m.text.includes('KSH International Limited'));
    assert.strictEqual(personMatches.length, 0, 'Company name must NOT be classified as PERSON');
  });

  runTest('PERSON: Reject legal & section phrases', () => {
    const matches = personDetector.detect('Board of Directors approved the Capital Structure in Statement of Assets.');
    assert.strictEqual(matches.length, 0, 'Section headers and committees must NOT be classified as PERSON');
  });

  // ----------------------------------------------------
  // 2. ORGANIZATION DETECTOR UNIT TESTS
  // ----------------------------------------------------
  console.log('\n--- 2. ORGANIZATION Detector Unit Tests ---');

  runTest('ORGANIZATION: Limited company', () => {
    const text = 'The document was prepared for KSH International Limited.';
    const matches = organizationDetector.detect(text);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].text, 'KSH International Limited');
    assert.strictEqual(matches[0].type, 'ORGANIZATION');
    assert.strictEqual(text.substring(matches[0].start, matches[0].end), matches[0].text);
  });

  runTest('ORGANIZATION: Private Limited & LLP', () => {
    const text = 'Audited by CARE Analytics and Advisory Private Limited and ABC Holdings LLP.';
    const matches = organizationDetector.detect(text);
    assert.ok(matches.length >= 1);
    assert.ok(matches.some(m => m.text.includes('CARE Analytics and Advisory Private Limited')));
  });

  runTest('ORGANIZATION: Exclude allowlisted regulatory entities (SEBI, BSE, Companies Act)', () => {
    const text = 'Filed with SEBI and listed on BSE under the Companies Act.';
    const matches = organizationDetector.detect(text);
    assert.strictEqual(matches.length, 0, 'SEBI, BSE, and Companies Act must be excluded by allowlist');
  });

  runTest('ORGANIZATION: Exclude generic committee (Board of Directors)', () => {
    const text = 'The Board of Directors met yesterday.';
    const matches = organizationDetector.detect(text);
    assert.strictEqual(matches.length, 0, 'Board of Directors must NOT be classified as Company PII');
  });

  // ----------------------------------------------------
  // 3. PHYSICAL ADDRESS DETECTOR UNIT TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. ADDRESS Detector Unit Tests ---');

  runTest('ADDRESS: Registered Office with PIN', () => {
    const text = 'Registered Office: 11/3, 11/4 and 11/5, Village Birdewadi, Chakan Taluka - Khed, Pune – 410 501, Maharashtra, India.';
    const matches = addressDetector.detect(text);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].type, 'ADDRESS');
    assert.ok(matches[0].text.includes('Village Birdewadi'));
    assert.strictEqual(text.substring(matches[0].start, matches[0].end), matches[0].text);
  });

  runTest('ADDRESS: Corporate Office with PIN', () => {
    const text = 'Corporate Office: 201, Tower 2, Montreal Business Centre, Off Pallod Farms, Baner, Pune – 411 045, Maharashtra, India.';
    const matches = addressDetector.detect(text);
    assert.strictEqual(matches.length, 1);
    assert.ok(matches[0].text.includes('Montreal Business Centre'));
    assert.strictEqual(text.substring(matches[0].start, matches[0].end), matches[0].text);
  });

  runTest('ADDRESS: Reject isolated city or state alone', () => {
    const text1 = 'The meeting was held in Pune.';
    const text2 = 'Operations are based in Maharashtra.';
    assert.strictEqual(addressDetector.detect(text1).length, 0, 'City alone must NOT be ADDRESS PII');
    assert.strictEqual(addressDetector.detect(text2).length, 0, 'State alone must NOT be ADDRESS PII');
  });

  runTest('ADDRESS: Reject random numeric sequence', () => {
    const matches = addressDetector.detect('Number sequence 12345678 was recorded.');
    assert.strictEqual(matches.length, 0, 'Numeric sequence is NOT ADDRESS PII');
  });

  // ----------------------------------------------------
  // 4. DOB DETECTOR UNIT TESTS
  // ----------------------------------------------------
  console.log('\n--- 4. DOB Detector Unit Tests ---');

  runTest('DOB: Explicit Date of Birth label', () => {
    const text = 'Name: John Doe, Date of Birth: 12/05/1979, Status: Active';
    const matches = dobDetector.detect(text);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].text, '12/05/1979');
    assert.strictEqual(matches[0].type, 'DOB');
    assert.strictEqual(text.substring(matches[0].start, matches[0].end), '12/05/1979');
  });

  runTest('DOB: DOB label with hyphenated format', () => {
    const text = 'Promoter details - DOB: 16-12-1985.';
    const matches = dobDetector.detect(text);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].text, '16-12-1985');
  });

  runTest('DOB: Reject ordinary date without DOB context', () => {
    const text = 'The agreement was signed on December 16, 2025.';
    const matches = dobDetector.detect(text);
    assert.strictEqual(matches.length, 0, 'Ordinary date without DOB label must NOT be DOB PII');
  });

  runTest('DOB: Reject financial period (FY 2024-25)', () => {
    const text = 'Financial statements for FY 2024-25 were presented.';
    const matches = dobDetector.detect(text);
    assert.strictEqual(matches.length, 0, 'Fiscal period must NOT be DOB PII');
  });

  // ----------------------------------------------------
  // 5. NEGATIVE CONTROL TESTS
  // ----------------------------------------------------
  console.log('\n--- 5. Negative Control Tests ---');

  runTest('NEGATIVE: Currency symbol (₹5) produces 0 PII', () => {
    const units = piiDetectionService.detectPiiInTextUnit({ id: 'u1', type: 'paragraph', text: 'Face value is ₹5 per share.' });
    assert.strictEqual(units.length, 0);
  });

  runTest('NEGATIVE: Corporate CIN (U28129PN1979PLC141032) is NOT Credit Card or SSN', () => {
    const text = 'CIN: U28129PN1979PLC141032';
    assert.strictEqual(creditCardDetector.detect(text).length, 0);
    assert.strictEqual(ssnDetector.detect(text).length, 0);
  });

  runTest('NEGATIVE: SEBI Registration No (INM000013004) is NOT SSN', () => {
    const text = 'SEBI Reg No: INM000013004';
    assert.strictEqual(ssnDetector.detect(text).length, 0);
  });

  runTest('NEGATIVE: 6-Digit PIN Code (410 501) is NOT Phone', () => {
    const matches = phoneDetector.detect('Pune – 410 501, Maharashtra');
    assert.strictEqual(matches.length, 0, 'PIN code alone must not be Phone PII');
  });

  // ----------------------------------------------------
  // 6. INTEGRATION TEST ON ACTUAL PROSPECTUS DOCX
  // ----------------------------------------------------
  console.log('\n--- 6. Integration Test on Actual Prospectus DOCX ---');

  const rphFileId = 'doc_1786622697521_f7e04c92f688';
  const filePath = path.join(__dirname, '../uploads', `${rphFileId}.docx`);

  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] Prospectus file ${filePath} not found for integration test.`);
  } else {
    const initialStats = fs.statSync(filePath);
    console.log(`  Scanning actual 127-page Red Herring Prospectus file (${(initialStats.size / 1024 / 1024).toFixed(2)} MB)...`);

    const startTime = Date.now();
    const result = await piiDetectionService.detectPiiInDocument(rphFileId);
    const durationMs = Date.now() - startTime;

    console.log(`\n  Execution Time: ${durationMs} ms`);
    console.log('  PII Detection Summary:');
    console.log(`  - EMAIL:         ${result.summary.EMAIL}`);
    console.log(`  - PHONE:         ${result.summary.PHONE}`);
    console.log(`  - IP_ADDRESS:    ${result.summary.IP_ADDRESS}`);
    console.log(`  - SSN:           ${result.summary.SSN}`);
    console.log(`  - CREDIT_CARD:   ${result.summary.CREDIT_CARD}`);
    console.log(`  - PERSON:        ${result.summary.PERSON}`);
    console.log(`  - ORGANIZATION:  ${result.summary.ORGANIZATION}`);
    console.log(`  - ADDRESS:       ${result.summary.ADDRESS}`);
    console.log(`  - DOB:           ${result.summary.DOB}`);
    console.log(`  - TOTAL PII:     ${result.summary.totalEntities}\n`);

    // Verify Substring Invariants for 100% of detected entities
    let invariantFailures = 0;
    const structuredDoc = await documentService.parseDocument(rphFileId);
    const unitMap = new Map();
    structuredDoc.content.forEach(u => unitMap.set(u.id, u));

    for (const entity of result.entities) {
      const unit = unitMap.get(entity.source.unitId);
      if (unit) {
        const sub = unit.text.substring(entity.start, entity.end);
        if (sub !== entity.text) {
          invariantFailures++;
          console.error(`  [INVARIANT FAIL] ${entity.type}: expected '${entity.text}' vs extracted '${sub}'`);
        }
      }
    }

    runTest('INTEGRATION: Substring invariant verification for 100% of entities', () => {
      assert.strictEqual(invariantFailures, 0, '100% of detected entities must satisfy substring invariant');
    });

    runTest('INTEGRATION: Source DOCX file immutability', () => {
      const finalStats = fs.statSync(filePath);
      assert.strictEqual(finalStats.size, initialStats.size, 'Source DOCX file size must be unchanged');
    });
  }

  console.log('\n====================================================');
  console.log(`  TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run runner if called directly
if (require.main === module) {
  runExecution006Tests();
}

module.exports = { runExecution006Tests };
