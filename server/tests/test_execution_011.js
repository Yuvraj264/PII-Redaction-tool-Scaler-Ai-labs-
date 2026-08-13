const assert = require('assert');
const path = require('path');
const evaluationEngine = require('../src/evaluation/engine/evaluationEngine');
const metricsCalculator = require('../src/evaluation/engine/metricsCalculator');
const goldDatasetValidator = require('../src/evaluation/validators/goldDatasetValidator');
const evaluationDatasetLoader = require('../src/evaluation/loaders/evaluationDatasetLoader');

console.log('====================================================');
console.log('   PII REDACTION TOOL — EXECUTION 011 TEST RUNNER   ');
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

// --- 1. Evaluation Engine Matching Tests ---
console.log('--- 1. Evaluation Engine Matching Tests ---');

runTest('TEST 1: Exact TP Match (Gold PERSON vs Prediction PERSON)', () => {
  const gold = [{ id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }];
  const pred = [{ id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }];

  const report = evaluationEngine.evaluate(pred, gold);
  assert.strictEqual(report.summary.truePositives, 1);
  assert.strictEqual(report.summary.falsePositives, 0);
  assert.strictEqual(report.summary.falseNegatives, 0);
  assert.strictEqual(report.microMetrics.precision, 1.0);
  assert.strictEqual(report.microMetrics.recall, 1.0);
  assert.strictEqual(report.microMetrics.f1, 1.0);
});

runTest('TEST 2: False Negative (Gold PERSON, No Prediction)', () => {
  const gold = [{ id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }];
  const pred = [];

  const report = evaluationEngine.evaluate(pred, gold);
  assert.strictEqual(report.summary.truePositives, 0);
  assert.strictEqual(report.summary.falseNegatives, 1);
  assert.strictEqual(report.microMetrics.recall, 0);
});

runTest('TEST 3: False Positive (No Gold, Prediction PERSON)', () => {
  const gold = [];
  const pred = [{ id: 'p1', type: 'PERSON', text: 'Board of Directors', start: 0, end: 18, source: { unitId: 'u1' } }];

  const report = evaluationEngine.evaluate(pred, gold);
  assert.strictEqual(report.summary.truePositives, 0);
  assert.strictEqual(report.summary.falsePositives, 1);
  assert.strictEqual(report.microMetrics.precision, 0);
});

runTest('TEST 4: Wrong Type Match (Gold PERSON vs Prediction ORGANIZATION)', () => {
  const gold = [{ id: 'g1', type: 'PERSON', text: 'Sarthak Malvadkar', start: 0, end: 17, source: { unitId: 'u1' } }];
  const pred = [{ id: 'p1', type: 'ORGANIZATION', text: 'Sarthak Malvadkar', start: 0, end: 17, source: { unitId: 'u1' } }];

  const report = evaluationEngine.evaluate(pred, gold);
  assert.strictEqual(report.summary.truePositives, 0);
  assert.strictEqual(report.summary.wrongTypes, 1);
  assert.strictEqual(report.summary.falsePositives, 1);
  assert.strictEqual(report.summary.falseNegatives, 1);
});

runTest('TEST 5: Partial Span Overlap (Gold "John Doe" vs Prediction "John")', () => {
  const gold = [{ id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } }];
  const pred = [{ id: 'p1', type: 'PERSON', text: 'John', start: 0, end: 4, source: { unitId: 'u1' } }];

  const report = evaluationEngine.evaluate(pred, gold);
  assert.strictEqual(report.summary.truePositives, 0);
  assert.strictEqual(report.summary.partialMatches, 1);
  assert.strictEqual(report.summary.falsePositives, 1);
});

// --- 2. Zero Handling & Metric Boundary Tests ---
console.log('\n--- 2. Zero Handling & Metric Boundary Tests ---');

runTest('TEST 6: Safe Zero Division Handling (No Gold & No Predictions)', () => {
  const report = evaluationEngine.evaluate([], []);
  assert.strictEqual(report.summary.truePositives, 0);
  assert.strictEqual(report.microMetrics.precision, 0);
  assert.strictEqual(report.microMetrics.recall, 0);
  assert.strictEqual(report.perTypeMetrics['PERSON'].precision, 'N/A');
});

runTest('TEST 7: Multiple Entity Types Micro & Macro Averages', () => {
  const gold = [
    { id: 'g1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
    { id: 'g2', type: 'EMAIL', text: 'john@example.com', start: 10, end: 26, source: { unitId: 'u1' } }
  ];
  const pred = [
    { id: 'p1', type: 'PERSON', text: 'John Doe', start: 0, end: 8, source: { unitId: 'u1' } },
    { id: 'p2', type: 'EMAIL', text: 'john@example.com', start: 10, end: 26, source: { unitId: 'u1' } }
  ];

  const report = evaluationEngine.evaluate(pred, gold);
  assert.strictEqual(report.summary.truePositives, 2);
  assert.strictEqual(report.microMetrics.f1, 1.0);
  assert.strictEqual(report.macroMetrics.f1, 1.0);
  assert.strictEqual(report.macroMetrics.evaluatedClassesCount, 2);
});

// --- 3. Dataset Validator & Loader Tests ---
console.log('\n--- 3. Dataset Validator & Loader Tests ---');

runTest('TEST 8: Gold Dataset Invariant Validation (Text & Offsets)', () => {
  const datasetPath = path.join(__dirname, '../src/evaluation/data/synthetic_gold_dataset.json');
  const textUnits = [
    { id: 'unit-00001', text: 'Contact John Doe at john@example.com or +91 9876543210.' },
    { id: 'unit-00002', text: 'Date of Birth: 12/05/1990' },
    { id: 'unit-00003', text: 'Company: Example Industries Limited' },
    { id: 'unit-00004', text: 'IP Address: 192.168.1.10' },
    { id: 'unit-00005', text: 'SSN: 900-01-0001' },
    { id: 'unit-00006', text: 'Card: 4111-1111-1111-1111' },
    { id: 'unit-00007', text: 'Address: 42 Industrial Estate Road, Pune 410501' }
  ];

  const { dataset, validation } = evaluationDatasetLoader.loadDataset(datasetPath, textUnits);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.summary.validAnnotations, 9);
});

runTest('TEST 9: Invalid Text Offset Detection', () => {
  const badDataset = {
    datasetVersion: '1.0',
    document: { fileName: 'bad.docx' },
    annotationPolicy: { matching: 'exact-span-and-type' },
    annotations: [
      { id: 'b1', type: 'PERSON', text: 'Invalid', start: 0, end: 7, source: { unitId: 'u1' } }
    ]
  };

  const textUnits = [{ id: 'u1', text: 'Different text content' }];
  const validation = goldDatasetValidator.validateDataset(badDataset, textUnits);
  assert.strictEqual(validation.isValid, false);
  assert.strictEqual(validation.errors.length, 1);
});

// --- 4. Synthetic Fixture Evaluation Run ---
console.log('\n--- 4. Synthetic Fixture Evaluation Run ---');

runTest('TEST 10: Synthetic Evaluation Fixture Run', () => {
  const datasetPath = path.join(__dirname, '../src/evaluation/data/synthetic_gold_dataset.json');
  const { dataset } = evaluationDatasetLoader.loadDataset(datasetPath);

  // Predictions exact match to synthetic gold
  const predictions = dataset.annotations.map((ann, i) => ({
    id: `pred-${i}`,
    type: ann.type,
    text: ann.text,
    start: ann.start,
    end: ann.end,
    source: ann.source
  }));

  const report = evaluationEngine.evaluate(predictions, dataset.annotations);
  assert.strictEqual(report.summary.truePositives, 9);
  assert.strictEqual(report.summary.falsePositives, 0);
  assert.strictEqual(report.summary.falseNegatives, 0);
  assert.strictEqual(report.microMetrics.f1, 1.0);
  assert.strictEqual(report.accuracy.entityLevelAccuracy, 1.0);
});

console.log('\n====================================================');
console.log(`  TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
