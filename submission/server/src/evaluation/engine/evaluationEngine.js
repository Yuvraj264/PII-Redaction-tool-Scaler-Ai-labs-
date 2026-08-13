const metricsCalculator = require('./metricsCalculator');
const evaluationInputContract = require('../contracts/evaluationInputContract');
const { ANNOTATION_POLICY } = require('../policy/annotationPolicy');

/**
 * Formal Evaluation Engine
 * Pure JavaScript module implementing deterministic span-level matching rules,
 * duplicate prediction detection, character mask projections, and 10x10 confusion matrix generation.
 */
class EvaluationEngine {
  /**
   * Evaluates predictions against gold annotations
   * @param {Array<Object>} predictions - Model predictions
   * @param {Array<Object>} goldAnnotations - Ground truth gold annotations
   * @param {Array<Object>} [textUnits] - Structured document text units for character accuracy
   * @returns {Object} Structured Evaluation Report
   */
  evaluate(predictions = [], goldAnnotations = [], textUnits = []) {
    // 1. Contract Validation
    const inputValidation = evaluationInputContract.validateInput({ goldAnnotations, predictions });
    if (!inputValidation.isValid) {
      throw new Error(`[EvaluationEngine Error] Invalid input contract: ${inputValidation.errors.join('; ')}`);
    }

    let tp = 0;
    let fp = 0;
    let fn = 0;
    let partial = 0;
    let wrongType = 0;
    let duplicateCount = 0;

    const wrongTypePairs = [];
    const partialDetails = [];

    // Per-type tracking structures
    const perTypeCounts = {};
    const matrixTypes = [...ANNOTATION_POLICY.supportedTypes, 'NONE'];
    const confusionMatrix = {};

    matrixTypes.forEach(t1 => {
      confusionMatrix[t1] = {};
      matrixTypes.forEach(t2 => {
        confusionMatrix[t1][t2] = 0;
      });
    });

    ANNOTATION_POLICY.supportedTypes.forEach(type => {
      perTypeCounts[type] = { tp: 0, fp: 0, fn: 0, partial: 0, wrongType: 0 };
    });

    // 2. Deterministically sort gold annotations and predictions
    const sortedGold = [...goldAnnotations].sort((a, b) => {
      const uA = a.source ? a.source.unitId : '';
      const uB = b.source ? b.source.unitId : '';
      if (uA !== uB) return uA.localeCompare(uB);
      return a.start - b.start;
    });

    const sortedPreds = [...predictions].sort((a, b) => {
      const uA = a.source ? a.source.unitId : '';
      const uB = b.source ? b.source.unitId : '';
      if (uA !== uB) return uA.localeCompare(uB);
      return a.start - b.start;
    });

    // Group gold annotations by unitId
    const goldByUnitMap = new Map();
    sortedGold.forEach(gold => {
      const unitId = gold.source ? gold.source.unitId : '';
      if (!goldByUnitMap.has(unitId)) {
        goldByUnitMap.set(unitId, []);
      }
      goldByUnitMap.get(unitId).push({ ...gold, matched: false });
    });

    // Track seen prediction signatures to detect duplicates
    const seenPredSignatures = new Set();

    // 3. Process predictions deterministically
    sortedPreds.forEach(pred => {
      const unitId = pred.source ? pred.source.unitId : '';
      const sig = `${unitId}:${pred.start}:${pred.end}:${pred.type}`;

      if (seenPredSignatures.has(sig)) {
        duplicateCount++;
        fp++; // Duplicate prediction contributes FP under strict entity evaluation
        if (perTypeCounts[pred.type]) perTypeCounts[pred.type].fp++;
        confusionMatrix[pred.type]['NONE']++;
        return;
      }
      seenPredSignatures.add(sig);

      const unitGolds = goldByUnitMap.get(unitId) || [];

      // Exact span match check
      const exactMatch = unitGolds.find(g => !g.matched && g.start === pred.start && g.end === pred.end);

      if (exactMatch) {
        exactMatch.matched = true;

        if (exactMatch.type === pred.type) {
          // Exact True Positive
          tp++;
          if (perTypeCounts[pred.type]) perTypeCounts[pred.type].tp++;
          confusionMatrix[pred.type][exactMatch.type]++;
        } else {
          // Wrong Type (counted as FP for pred.type, FN for gold.type)
          wrongType++;
          fp++;
          fn++;
          if (perTypeCounts[pred.type]) {
            perTypeCounts[pred.type].fp++;
            perTypeCounts[pred.type].wrongType++;
          }
          if (perTypeCounts[exactMatch.type]) {
            perTypeCounts[exactMatch.type].fn++;
            perTypeCounts[exactMatch.type].wrongType++;
          }
          confusionMatrix[pred.type][exactMatch.type]++;
          wrongTypePairs.push({
            unitId,
            predType: pred.type,
            goldType: exactMatch.type,
            text: pred.text,
            start: pred.start,
            end: pred.end
          });
        }
      } else {
        // Partial overlap check (gold.start < pred.end && pred.start < gold.end)
        const partialMatch = unitGolds.find(g => !g.matched && (pred.start < g.end && g.start < pred.end));

        if (partialMatch) {
          partial++;
          fp++;
          if (perTypeCounts[pred.type]) {
            perTypeCounts[pred.type].fp++;
            perTypeCounts[pred.type].partial++;
          }
          confusionMatrix[pred.type]['NONE']++;
          partialDetails.push({
            unitId,
            predType: pred.type,
            goldType: partialMatch.type,
            predText: pred.text,
            goldText: partialMatch.text,
            predSpan: [pred.start, pred.end],
            goldSpan: [partialMatch.start, partialMatch.end]
          });
        } else {
          // Complete False Positive
          fp++;
          if (perTypeCounts[pred.type]) perTypeCounts[pred.type].fp++;
          confusionMatrix[pred.type]['NONE']++;
        }
      }
    });

    // 4. Process remaining unmatched gold annotations -> False Negatives
    sortedGold.forEach(gold => {
      const unitId = gold.source ? gold.source.unitId : '';
      const unitGolds = goldByUnitMap.get(unitId) || [];
      const matchInUnit = unitGolds.find(g => g.id === gold.id);

      if (matchInUnit && !matchInUnit.matched) {
        fn++;
        if (perTypeCounts[gold.type]) perTypeCounts[gold.type].fn++;
        confusionMatrix['NONE'][gold.type]++;
      }
    });

    // 5. Compute character-level metrics across text units
    const tokenMetrics = this.calculateTokenMetrics(sortedPreds, sortedGold, textUnits);

    // 6. Assemble report via metricsCalculator
    return metricsCalculator.calculateMetrics({
      tp,
      fp,
      fn,
      partial,
      wrongType,
      duplicateCount,
      perTypeCounts,
      confusionMatrix,
      tokenMetrics,
      wrongTypePairs,
      partialDetails
    });
  }

  /**
   * Helper to compute character span mask projection metrics across text units
   * @param {Array} predictions 
   * @param {Array} goldAnnotations 
   * @param {Array} textUnits 
   * @returns {Object} { tpTokens, fpTokens, fnTokens, tnTokens }
   */
  calculateTokenMetrics(predictions, goldAnnotations, textUnits) {
    if (!Array.isArray(textUnits) || textUnits.length === 0) {
      return { tpTokens: 0, fpTokens: 0, fnTokens: 0, tnTokens: 0 };
    }

    let tpTokens = 0;
    let fpTokens = 0;
    let fnTokens = 0;
    let tnTokens = 0;

    textUnits.forEach(unit => {
      const text = unit.text || '';
      if (text.length === 0) return;

      const predMask = new Array(text.length).fill(false);
      const goldMask = new Array(text.length).fill(false);

      predictions.filter(p => p.source && p.source.unitId === unit.id).forEach(p => {
        const s = Math.max(0, p.start);
        const e = Math.min(text.length, p.end);
        for (let i = s; i < e; i++) predMask[i] = true;
      });

      goldAnnotations.filter(g => g.source && g.source.unitId === unit.id).forEach(g => {
        const s = Math.max(0, g.start);
        const e = Math.min(text.length, g.end);
        for (let i = s; i < e; i++) goldMask[i] = true;
      });

      for (let i = 0; i < text.length; i++) {
        if (predMask[i] && goldMask[i]) tpTokens++;
        else if (predMask[i] && !goldMask[i]) fpTokens++;
        else if (!predMask[i] && goldMask[i]) fnTokens++;
        else tnTokens++;
      }
    });

    return { tpTokens, fpTokens, fnTokens, tnTokens };
  }
}

module.exports = new EvaluationEngine();
