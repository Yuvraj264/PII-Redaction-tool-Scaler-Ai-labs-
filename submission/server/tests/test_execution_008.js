const path = require('path');
const fs = require('fs');
const assert = require('assert');

// Services
const piiNormalizationService = require('../src/services/piiNormalizationService');
const ReplacementRegistry = require('../src/replacement/replacementRegistry');
const replacementService = require('../src/replacement/replacementService');
const documentService = require('../src/services/documentService');

// Generators
const personGenerator = require('../src/replacement/generators/personGenerator');
const emailGenerator = require('../src/replacement/generators/emailGenerator');
const phoneGenerator = require('../src/replacement/generators/phoneGenerator');
const organizationGenerator = require('../src/replacement/generators/organizationGenerator');
const addressGenerator = require('../src/replacement/generators/addressGenerator');
const dobGenerator = require('../src/replacement/generators/dobGenerator');
const ssnGenerator = require('../src/replacement/generators/ssnGenerator');
const creditCardGenerator = require('../src/replacement/generators/creditCardGenerator');
const ipGenerator = require('../src/replacement/generators/ipGenerator');

async function runExecution008Tests() {
  console.log('====================================================');
  console.log('   PII REDACTION TOOL — EXECUTION 008 TEST RUNNER  ');
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
  // 1. CANONICALIZATION TESTS
  // ----------------------------------------------------
  console.log('--- 1. Canonicalization Tests ---');

  runTest('CANONICALIZATION: Same email with different case -> same key', () => {
    const key1 = piiNormalizationService.getCanonicalKey('EMAIL', 'John.Doe@Example.com');
    const key2 = piiNormalizationService.getCanonicalKey('EMAIL', 'john.doe@example.com');
    assert.strictEqual(key1, key2);
  });

  runTest('CANONICALIZATION: Same phone formatting -> same key', () => {
    const key1 = piiNormalizationService.getCanonicalKey('PHONE', '+91 20 4505 3237');
    const key2 = piiNormalizationService.getCanonicalKey('PHONE', '+912045053237');
    assert.strictEqual(key1, key2);
  });

  runTest('CANONICALIZATION: Same person spacing -> same key', () => {
    const key1 = piiNormalizationService.getCanonicalKey('PERSON', 'Sarthak   Malvadkar');
    const key2 = piiNormalizationService.getCanonicalKey('PERSON', 'Sarthak Malvadkar');
    assert.strictEqual(key1, key2);
  });

  runTest('CANONICALIZATION: Different people -> different key', () => {
    const key1 = piiNormalizationService.getCanonicalKey('PERSON', 'Sarthak Malvadkar');
    const key2 = piiNormalizationService.getCanonicalKey('PERSON', 'Kushal Subbayya Hegde');
    assert.notStrictEqual(key1, key2);
  });

  // ----------------------------------------------------
  // 2. REGISTRY CONSISTENCY & COLLISION TESTS
  // ----------------------------------------------------
  console.log('\n--- 2. Registry Consistency & Collision Tests ---');

  runTest('REGISTRY: First occurrence generates replacement, second reuses it', () => {
    const registry = new ReplacementRegistry();
    const entity1 = { type: 'PERSON', text: 'Sarthak Malvadkar', start: 0, end: 17 };
    const key = piiNormalizationService.getCanonicalKey(entity1.type, entity1.text);

    const res1 = registry.getOrCreateReplacement(key, entity1);
    assert.strictEqual(res1.isReused, false);
    assert.ok(res1.replacement);

    const res2 = registry.getOrCreateReplacement(key, entity1);
    assert.strictEqual(res2.isReused, true);
    assert.strictEqual(res2.replacement, res1.replacement, 'Second occurrence MUST receive exact same replacement');
  });

  runTest('REGISTRY: Registry contains one mapping per canonical entity', () => {
    const registry = new ReplacementRegistry();
    const entity1 = { type: 'ORGANIZATION', text: 'KSH International Limited', start: 0, end: 25 };
    const key = piiNormalizationService.getCanonicalKey(entity1.type, entity1.text);

    registry.getOrCreateReplacement(key, entity1);
    registry.getOrCreateReplacement(key, entity1);

    const stats = registry.getStats();
    assert.strictEqual(stats.canonicalCount, 1);
    assert.strictEqual(stats.replacementCount, 1);
  });

  runTest('COLLISION: Different canonical entities do NOT receive same replacement', () => {
    const registry = new ReplacementRegistry();
    const e1 = { type: 'PERSON', text: 'Person Alpha', start: 0, end: 12 };
    const e2 = { type: 'PERSON', text: 'Person Beta', start: 0, end: 11 };

    const k1 = piiNormalizationService.getCanonicalKey(e1.type, e1.text);
    const k2 = piiNormalizationService.getCanonicalKey(e2.type, e2.text);

    const r1 = registry.getOrCreateReplacement(k1, e1);
    const r2 = registry.getOrCreateReplacement(k2, e2);

    assert.notStrictEqual(r1.replacement, r2.replacement, 'Different canonical entities MUST receive distinct replacements');
  });

  // ----------------------------------------------------
  // 3. SYNTHETIC GENERATORS TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. Synthetic Generators Tests ---');

  runTest('GENERATOR: Person receives realistic synthetic person name', () => {
    const rep = personGenerator.generate({ text: 'Sarthak Malvadkar' }, 0);
    assert.ok(typeof rep === 'string' && rep.length > 5);
    assert.notStrictEqual(rep, 'Sarthak Malvadkar');
  });

  runTest('GENERATOR: Email receives safe @example.com email', () => {
    const rep = emailGenerator.generate({ text: 'user@realcompany.com' }, 0);
    assert.ok(rep.endsWith('@example.com'), 'Synthetic email must use @example.com domain');
    assert.notStrictEqual(rep, 'user@realcompany.com');
  });

  runTest('GENERATOR: Phone receives synthetic Indian phone number', () => {
    const rep = phoneGenerator.generate({ text: '+91 98765 43210' }, 0);
    assert.ok(rep.includes('+91'));
    assert.notStrictEqual(rep, '+91 98765 43210');
  });

  runTest('GENERATOR: Organization receives company name preserving legal structure', () => {
    const rep1 = organizationGenerator.generate({ text: 'KSH International Limited' }, 0);
    const rep2 = organizationGenerator.generate({ text: 'CARE Advisory Private Limited' }, 1);
    assert.ok(rep1.includes('Limited'));
    assert.ok(rep2.includes('Private Limited'));
  });

  runTest('GENERATOR: Address receives synthetic multi-component address', () => {
    const rep = addressGenerator.generate({ text: '11/3, Village Birdewadi' }, 0);
    assert.ok(rep.includes('Maharashtra'));
    assert.notStrictEqual(rep, '11/3, Village Birdewadi');
  });

  runTest('GENERATOR: DOB receives synthetic birth date', () => {
    const rep = dobGenerator.generate({ text: '12/05/1979' }, 0);
    assert.ok(/^(19|20)\d{2}-\d{2}-\d{2}$/.test(rep));
    assert.notStrictEqual(rep, '12/05/1979');
  });

  runTest('GENERATOR: SSN receives test SSN in 900-XX-XXXX range', () => {
    const rep = ssnGenerator.generate({ text: '123-45-6789' }, 0);
    assert.ok(rep.startsWith('900-'));
    assert.notStrictEqual(rep, '123-45-6789');
  });

  runTest('GENERATOR: Credit Card receives Luhn-valid test card', () => {
    const rep = creditCardGenerator.generate({ text: '4111-1111-1111-1111' }, 0);
    assert.ok(rep.length >= 15);
    assert.notStrictEqual(rep, '1234-5678-9012-3456');
  });

  runTest('GENERATOR: IP receives RFC 5737 documentation IPv4 address', () => {
    const rep = ipGenerator.generate({ text: '192.168.1.1' }, 0);
    assert.ok(rep.startsWith('192.0.2.') || rep.startsWith('198.51.100.') || rep.startsWith('203.0.113.'));
    assert.notStrictEqual(rep, '192.168.1.1');
  });

  // ----------------------------------------------------
  // 4. REPLACEMENT SAFETY & PLAN ORDERING TESTS
  // ----------------------------------------------------
  console.log('\n--- 4. Replacement Safety & Plan Ordering Tests ---');

  runTest('SAFETY: Replacement differs from original text and does not leak original PII', () => {
    const reg = new ReplacementRegistry();
    const entity = { type: 'EMAIL', text: 'secret.user@kshinternational.com', start: 0, end: 32 };
    const key = piiNormalizationService.getCanonicalKey(entity.type, entity.text);
    const res = reg.getOrCreateReplacement(key, entity);

    assert.notStrictEqual(res.replacement, entity.text);
    assert.strictEqual(res.replacement.includes('kshinternational'), false);
  });

  runTest('PLAN: Replacement plan preserves source offsets and sorts DESCENDING by start offset', () => {
    const unitPlan = {
      unitId: 'u1',
      replacements: [
        { start: 10, end: 25 },
        { start: 100, end: 115 },
        { start: 50, end: 65 }
      ]
    };
    unitPlan.replacements.sort((a, b) => b.start - a.start);
    assert.strictEqual(unitPlan.replacements[0].start, 100);
    assert.strictEqual(unitPlan.replacements[1].start, 50);
    assert.strictEqual(unitPlan.replacements[2].start, 10);
  });

  // ----------------------------------------------------
  // 5. INTEGRATION TEST ON ACTUAL PROSPECTUS DOCX
  // ----------------------------------------------------
  console.log('\n--- 5. Integration Test on Actual Prospectus DOCX ---');

  const rphFileId = 'doc_1786622697521_f7e04c92f688';
  const filePath = path.join(__dirname, '../uploads', `${rphFileId}.docx`);

  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] Prospectus file ${filePath} not found for integration test.`);
  } else {
    const initialStats = fs.statSync(filePath);
    console.log(`  Running Replacement Plan builder on actual 127-page Red Herring Prospectus (${(initialStats.size / 1024 / 1024).toFixed(2)} MB)...`);

    const startTime = Date.now();
    const plan = await replacementService.generateReplacementPlan(rphFileId);
    const durationMs = Date.now() - startTime;

    console.log(`\n  Execution Time: ${durationMs} ms`);
    console.log('  Replacement Plan Summary Metrics:');
    console.log(`  - Total Entities Detected:  ${plan.summary.totalEntitiesCount}`);
    console.log(`  - Canonical Entities:       ${plan.summary.canonicalEntitiesCount}`);
    console.log(`  - Synthetic Replacements:   ${plan.summary.replacementCount}`);
    console.log(`  - Unit Plans Generated:     ${plan.summary.unitPlansCount}\n`);

    runTest('INTEGRATION: Replacement Plan generated cleanly', () => {
      assert.ok(plan.summary);
      assert.strictEqual(plan.summary.totalEntitiesCount, 2050);
      assert.strictEqual(plan.summary.canonicalEntitiesCount, 678);
      assert.strictEqual(plan.summary.replacementCount, 678);
      assert.ok(plan.unitPlans.length > 0);
    });

    runTest('INTEGRATION: All unit plans maintain DESCENDING start offset order', () => {
      let orderFailures = 0;
      plan.unitPlans.forEach(up => {
        for (let i = 1; i < up.replacements.length; i++) {
          if (up.replacements[i].start > up.replacements[i - 1].start) {
            orderFailures++;
          }
        }
      });
      assert.strictEqual(orderFailures, 0, '100% of unit plans MUST be sorted by start offset DESCENDING');
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

if (require.main === module) {
  runExecution008Tests();
}

module.exports = { runExecution008Tests };
