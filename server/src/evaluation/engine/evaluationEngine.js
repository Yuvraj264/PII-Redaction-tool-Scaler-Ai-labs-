const metricsCalculator = require('./metricsCalculator');
const { ANNOTATION_POLICY } = require('../policy/annotationPolicy');

/**
 * Evaluation Engine Foundation
 * Implements span-level matching rules, TP/FP/FN/Partial/WrongType classification,
 * and passes aggregate counts to metricsCalculator.
 */
class EvaluationEngine {
  /**
   * Evaluates predictions against gold annotations
   * @param {Array<Object>} predictions - Model predictions ([{ id, type, text, start, end, source: { unitId } }])
   * @param {Array<Object>} goldAnnotations - Gold truth annotations ([{ id, type, text, start, end, source: { unitId } }])
   * @param {Array<Object>} [textUnits] - Optional document text units for token accuracy calculation
   * @returns {Object} Evaluation Report payload
   */
  evaluate(predictions = [], goldAnnotations = [], textUnits = []) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let partial = 0;
    let wrongType = 0;

    // Per-type tracking structures
    const perTypeCounts = {};
    const confusionMatrix = {};

    ANNOTATION_POLICY.supportedTypes.forEach(t1 => {
      perTypeCounts[t1] = { tp: 0, fp: 0, fn: 0, partial: 0, wrongType: 0 };
      confusionMatrix[t1] = {};
      ANNOTATION_POLICY.supportedTypes.forEach(t2 => {
        confusionMatrix[t1][t2] = 0;
      });
    });

    // Group gold annotations by unitId
    const goldByUnitMap = new Map();
    goldAnnotations.forEach(gold => {
      const unitId = gold.source ? gold.source.unitId : '';
      if (!goldByUnitMap.has(unitId)) {
        goldByUnitMap.set(unitId, []);
      }
      goldByUnitMap.get(unitId).push({ ...gold, matched: false });
    });

    // Process predictions
    predictions.forEach(pred => {
      const unitId = pred.source ? pred.source.unitId : '';
      const unitGolds = goldByUnitMap.get(unitId) || [];

      // 1. Look for EXACT SPAN match (unitId, start, end)
      const exactMatch = unitGolds.find(g => !g.matched && g.start === pred.start && g.end === pred.end);

      if (exactMatch) {
        exactMatch.matched = true;

        if (exactMatch.type === pred.type) {
          // Exact True Positive
          tp++;
          if (perTypeCounts[pred.type]) perTypeCounts[pred.type].tp++;
          if (confusionMatrix[pred.type] && confusionMatrix[pred.type][exactMatch.type] !== undefined) {
            confusionMatrix[pred.type][exactMatch.type]++;
          }
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
          if (confusionMatrix[pred.type] && confusionMatrix[pred.type][exactMatch.type] !== undefined) {
            confusionMatrix[pred.type][exactMatch.type]++;
          }
        }
      } else {
        // 2. Check for PARTIAL OVERLAP (gold.start < pred.end && pred.start < gold.end)
        const partialMatch = unitGolds.find(g => !g.matched && (pred.start < g.end && g.start < pred.end));

        if (partialMatch) {
          // Track partial match separately (NOT TP)
          partial++;
          fp++; // Unmatched prediction counts as FP for precision calculation
          if (perTypeCounts[pred.type]) {
            perTypeCounts[pred.type].fp++;
            perTypeCounts[pred.type].partial++;
          }
        } else {
          // 3. Complete False Positive
          fp++;
          if (perTypeCounts[pred.type]) perTypeCounts[pred.type].fp++;
        }
      }
    });

    // Process remaining unmatched gold annotations -> False Negatives
    goldAnnotations.forEach(gold => {
      const unitId = gold.source ? gold.source.unitId : '';
      const unitGolds = goldByUnitMap.get(unitId) || [];
      const matchInUnit = unitGolds.find(g => g.id === gold.id);

      if (matchInUnit && !matchInUnit.matched) {
        fn++;
        if (perTypeCounts[gold.type]) perTypeCounts[gold.type].fn++;
      }
    });

    // Calculate Token-Level Metrics across textUnits if available
    const tokenMetrics = this.calculateTokenMetrics(predictions, goldAnnotations, textUnits);

    // Assembly via metricsCalculator
    return metricsCalculator.calculateMetrics({
      tp,
      fp,
      fn,
      partial,
      wrongType,
      perTypeCounts,
      confusionMatrix,
      tokenMetrics
    });
  }

  /**
   * Helper to compute token/character-level confusion matrix metrics
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
        for (let i = p.start; i < Math.min(p.end, text.length); i++) predMask[i] = true;
      });

      goldAnnotations.filter(g => g.source && g.source.unitId === unit.id).forEach(g => {
        for (let i = g.start; i < Math.min(g.end, text.length); i++) goldMask[i] = true;
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
