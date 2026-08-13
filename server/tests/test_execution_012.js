const assert = require('assert');
const path = require('path');
const http = require('http');
const evaluationEngine = require('../src/evaluation/engine/evaluationEngine');
const evaluationInputContract = require('../src/evaluation/contracts/evaluationInputContract');
const evaluationDatasetLoader = require('../src/evaluation/loaders/evaluationDatasetLoader');
const app = require('../src/app');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 012 TEST RUNNER   ');
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
  // --- 1. Synthetic Metric Reproduction Tests ---
  console.log('--- 1. Synthetic Metric Reproduction Tests ---');

  runTest('TEST 1: Synthetic Exact Match (Precision=1, Recall=1, F1=1, Char Accuracy=1)', () => {
    const gold = [
      { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
      { id: 'g2', type: 'EMAIL', text: 'john@example.com', start: 10, end: 26, source: { unitId: 'u1' } },
      { id: 'g3', type: 'PHONE', text: '+91 9876543210', start: 30, end: 44, source: { unitId: 'u1' } }
    ];
    const pred = [
      { id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
      { id: 'p2', type: 'EMAIL', text: 'john@example.com', start: 10, end: 26, source: { unitId: 'u1' } },
      { id: 'p3', type: 'PHONE', text: '+91 9876543210', start: 30, end: 44, source: { unitId: 'u1' } }
    ];
    const textUnits = [{ id: 'u1', text: 'John Doe, john@example.com, +91 9876543210' }];

    const report = evaluationEngine.evaluate(pred, gold, textUnits);
    assert.strictEqual(report.entityLevel.overall.truePositives, 3);
    assert.strictEqual(report.entityLevel.overall.falsePositives, 0);
    assert.strictEqual(report.entityLevel.overall.falseNegatives, 0);
    assert.strictEqual(report.entityLevel.overall.precision, 1.0);
    assert.strictEqual(report.entityLevel.overall.recall, 1.0);
    assert.strictEqual(report.entityLevel.overall.f1, 1.0);
    assert.strictEqual(report.characterLevel.characterAccuracy, 1.0);
  });

  runTest('TEST 2: Synthetic FP Test (TP=1, FP=1, FN=0 -> P=0.5, R=1.0, F1=0.6667)', () => {
    const gold = [
      { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
    ];
    const pred = [
      { id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
      { id: 'p2', type: 'PERSON', text: 'Fake Person', start: 10, end: 21, source: { unitId: 'u1' } }
    ];

    const report = evaluationEngine.evaluate(pred, gold);
    assert.strictEqual(report.entityLevel.overall.truePositives, 1);
    assert.strictEqual(report.entityLevel.overall.falsePositives, 1);
    assert.strictEqual(report.entityLevel.overall.falseNegatives, 0);
    assert.strictEqual(report.entityLevel.overall.precision, 0.5);
    assert.strictEqual(report.entityLevel.overall.recall, 1.0);
    assert.strictEqual(report.entityLevel.overall.f1, 0.6667);
  });

  runTest('TEST 3: Synthetic FN Test (TP=1, FP=0, FN=1 -> P=1.0, R=0.5, F1=0.6667)', () => {
    const gold = [
      { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
      { id: 'g2', type: 'EMAIL', text: 'john@example.com', start: 10, end: 26, source: { unitId: 'u1' } }
    ];
    const pred = [
      { id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
    ];

    const report = evaluationEngine.evaluate(pred, gold);
    assert.strictEqual(report.entityLevel.overall.truePositives, 1);
    assert.strictEqual(report.entityLevel.overall.falsePositives, 0);
    assert.strictEqual(report.entityLevel.overall.falseNegatives, 1);
    assert.strictEqual(report.entityLevel.overall.precision, 1.0);
    assert.strictEqual(report.entityLevel.overall.recall, 0.5);
    assert.strictEqual(report.entityLevel.overall.f1, 0.6667);
  });

  runTest('TEST 4: Synthetic Wrong-Type Test (Gold PERSON, Pred ORG -> FP for ORG, FN for PERSON)', () => {
    const gold = [
      { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
    ];
    const pred = [
      { id: 'p1', type: 'ORGANIZATION', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
    ];

    const report = evaluationEngine.evaluate(pred, gold);
    assert.strictEqual(report.entityLevel.overall.truePositives, 0);
    assert.strictEqual(report.entityLevel.overall.falsePositives, 1);
    assert.strictEqual(report.entityLevel.overall.falseNegatives, 1);
    assert.strictEqual(report.errorBreakdown.wrongType.total, 1);
    assert.strictEqual(report.confusionMatrix['ORGANIZATION']['PERSON'], 1);
  });

  runTest('TEST 5: Synthetic Partial Overlap Test (Gold "John Doe" vs Pred "John")', () => {
    const gold = [
      { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
    ];
    const pred = [
      { id: 'p1', type: 'PERSON', text: 'John', start: 0, end: 4, source: { unitId: 'u1' } }
    ];

    const report = evaluationEngine.evaluate(pred, gold);
    assert.strictEqual(report.entityLevel.overall.truePositives, 0);
    assert.strictEqual(report.errorBreakdown.partialMatches.total, 1);
    assert.strictEqual(report.entityLevel.overall.falsePositives, 1);
  });

  runTest('TEST 6: Duplicate Predictions Tracking', () => {
    const gold = [
      { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
    ];
    const pred = [
      { id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
      { id: 'p2', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
    ];

    const report = evaluationEngine.evaluate(pred, gold);
    assert.strictEqual(report.entityLevel.overall.truePositives, 1);
    assert.strictEqual(report.errorBreakdown.duplicatePredictions.total, 1);
    assert.strictEqual(report.entityLevel.overall.falsePositives, 1);
  });

  runTest('TEST 7: No-Gold Handling (Precision=0, Recall="N/A")', () => {
    const gold = [];
    const pred = [{ id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }];

    const report = evaluationEngine.evaluate(pred, gold);
    assert.strictEqual(report.entityLevel.overall.precision, 0);
    assert.strictEqual(report.entityLevel.overall.recall, 'N/A');
    assert.strictEqual(report.confusionMatrix['PERSON']['NONE'], 1);
  });

  runTest('TEST 8: No-Prediction Handling (Precision="N/A", Recall=0)', () => {
    const gold = [{ id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }];
    const pred = [];

    const report = evaluationEngine.evaluate(pred, gold);
    assert.strictEqual(report.entityLevel.overall.precision, 'N/A');
    assert.strictEqual(report.entityLevel.overall.recall, 0);
    assert.strictEqual(report.confusionMatrix['NONE']['PERSON'], 1);
  });

  // --- 2. Character Accuracy & Per-Type Tests ---
  console.log('\n--- 2. Character Accuracy & Per-Type Tests ---');

  runTest('TEST 9: Character Accuracy Projection (Exact vs Extra PII Characters)', () => {
    const textUnits = [{ id: 'u1', text: 'John Doe works here.' }];
    const gold = [{ id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }];
    const predWithExtra = [
      { id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
      { id: 'p2', type: 'PERSON', text: 'works', start: 9, end: 14, source: { unitId: 'u1' } }
    ];

    const report = evaluationEngine.evaluate(predWithExtra, gold, textUnits);
    assert.strictEqual(report.characterLevel.fpCharacters, 5);
    assert.strictEqual(report.characterLevel.characterAccuracy < 1.0, true);
  });

  runTest('TEST 10: Per-Type Independent Metrics Across 9 Categories', () => {
    const datasetPath = path.join(__dirname, '../src/evaluation/data/synthetic_gold_dataset.json');
    const { dataset } = evaluationDatasetLoader.loadDataset(datasetPath);

    const report = evaluationEngine.evaluate(dataset.annotations, dataset.annotations);
    assert.strictEqual(report.entityLevel.macro.evaluatedClassesCount, 9);
    assert.strictEqual(report.entityLevel.perType['PERSON'].f1, 1.0);
    assert.strictEqual(report.entityLevel.perType['EMAIL'].f1, 1.0);
    assert.strictEqual(report.entityLevel.perType['CREDIT_CARD'].f1, 1.0);
  });

  // --- 3. API Endpoint Integration Test ---
  console.log('\n--- 3. API Endpoint Integration Test ---');

  await runAsyncTest('TEST 11: HTTP API POST /api/evaluation/run (Raw Inputs Mode)', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const payload = JSON.stringify({
      goldAnnotations: [
        { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
      ],
      predictions: [
        { id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }
      ]
    });

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
    assert.strictEqual(res.body.result.evaluationReport.entityLevel.overall.truePositives, 1);
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
