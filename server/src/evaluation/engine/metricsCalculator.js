const { ANNOTATION_POLICY } = require('../policy/annotationPolicy');

/**
 * Metrics Calculator Service
 * Computes Precision, Recall, F1, Entity-Level Accuracy, Token Accuracy,
 * Per-Type Metrics, Micro/Macro Averages, and Type-Level Confusion Matrix.
 */
class MetricsCalculator {
  /**
   * Calculates comprehensive evaluation metrics from classified evaluation counts
   * @param {Object} rawCounts - { tp, fp, fn, partial, wrongType, perTypeCounts, confusionMatrix, tokenMetrics }
   * @returns {Object} Structured Evaluation Report Metrics
   */
  calculateMetrics(rawCounts) {
    const { tp = 0, fp = 0, fn = 0, partial = 0, wrongType = 0, perTypeCounts = {}, confusionMatrix = {}, tokenMetrics = { tpTokens: 0, fpTokens: 0, fnTokens: 0, tnTokens: 0 } } = rawCounts;

    // Overall Micro Metrics
    const microPrecision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const microRecall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const microF1 = (microPrecision + microRecall) > 0 ? (2 * microPrecision * microRecall) / (microPrecision + microRecall) : 0;

    // Entity-Level Accuracy: TP / (TP + FP + FN)
    const entityAccuracy = (tp + fp + fn) > 0 ? tp / (tp + fp + fn) : 0;

    // Token-Level Accuracy: (TP_tokens + TN_tokens) / (TP_tokens + TN_tokens + FP_tokens + FN_tokens)
    const totalTokens = tokenMetrics.tpTokens + tokenMetrics.tnTokens + tokenMetrics.fpTokens + tokenMetrics.fnTokens;
    const tokenAccuracy = totalTokens > 0 ? (tokenMetrics.tpTokens + tokenMetrics.tnTokens) / totalTokens : 0;

    // Per-Type Metrics
    const perTypeMetrics = {};
    const validMacroClasses = [];

    ANNOTATION_POLICY.supportedTypes.forEach(type => {
      const counts = perTypeCounts[type] || { tp: 0, fp: 0, fn: 0, partial: 0, wrongType: 0 };
      const tTp = counts.tp;
      const tFp = counts.fp;
      const tFn = counts.fn;
      const tTotalGold = tTp + tFn;

      if (tTotalGold === 0 && tFp === 0) {
        perTypeMetrics[type] = {
          tp: 0,
          fp: 0,
          fn: 0,
          partial: counts.partial,
          wrongType: counts.wrongType,
          precision: 'N/A',
          recall: 'N/A',
          f1: 'N/A',
          status: 'NO_GOLD_OCCURRENCES'
        };
      } else {
        const p = (tTp + tFp) > 0 ? tTp / (tTp + tFp) : 0;
        const r = (tTp + tFn) > 0 ? tTp / (tTp + tFn) : 0;
        const f1 = (p + r) > 0 ? (2 * p * r) / (p + r) : 0;

        perTypeMetrics[type] = {
          tp: tTp,
          fp: tFp,
          fn: tFn,
          partial: counts.partial,
          wrongType: counts.wrongType,
          precision: Number(p.toFixed(4)),
          recall: Number(r.toFixed(4)),
          f1: Number(f1.toFixed(4)),
          status: 'EVALUATED'
        };

        validMacroClasses.push(perTypeMetrics[type]);
      }
    });

    // Macro Metrics (Average over classes with gold/predictions present)
    let macroPrecision = 0;
    let macroRecall = 0;
    let macroF1 = 0;

    if (validMacroClasses.length > 0) {
      const sumP = validMacroClasses.reduce((sum, c) => sum + (typeof c.precision === 'number' ? c.precision : 0), 0);
      const sumR = validMacroClasses.reduce((sum, c) => sum + (typeof c.recall === 'number' ? c.recall : 0), 0);
      const sumF1 = validMacroClasses.reduce((sum, c) => sum + (typeof c.f1 === 'number' ? c.f1 : 0), 0);

      macroPrecision = sumP / validMacroClasses.length;
      macroRecall = sumR / validMacroClasses.length;
      macroF1 = sumF1 / validMacroClasses.length;
    }

    return {
      summary: {
        totalGoldAnnotations: tp + fn,
        totalPredictions: tp + fp,
        truePositives: tp,
        falsePositives: fp,
        falseNegatives: fn,
        partialMatches: partial,
        wrongTypes: wrongType
      },
      microMetrics: {
        precision: Number(microPrecision.toFixed(4)),
        recall: Number(microRecall.toFixed(4)),
        f1: Number(microF1.toFixed(4))
      },
      macroMetrics: {
        precision: Number(macroPrecision.toFixed(4)),
        recall: Number(macroRecall.toFixed(4)),
        f1: Number(macroF1.toFixed(4)),
        evaluatedClassesCount: validMacroClasses.length
      },
      accuracy: {
        entityLevelAccuracy: Number(entityAccuracy.toFixed(4)),
        tokenLevelAccuracy: Number(tokenAccuracy.toFixed(4)),
        formulation: 'Entity-Level Accuracy = TP / (TP + FP + FN)'
      },
      perTypeMetrics,
      confusionMatrix
    };
  }
}

module.exports = new MetricsCalculator();
