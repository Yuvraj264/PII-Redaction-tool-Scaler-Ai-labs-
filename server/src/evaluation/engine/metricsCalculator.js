const { ANNOTATION_POLICY } = require('../policy/annotationPolicy');

/**
 * Metrics Calculator Service
 * Computes Precision, Recall, F1, Entity-Level Accuracy, Character-Level Accuracy,
 * Per-Type Metrics, Micro/Macro Averages, Detailed Error Breakdown, and 10x10 Type Confusion Matrix.
 */
class MetricsCalculator {
  /**
   * Helper to format numbers safely (returns "N/A" for NaN/undefined, rounded percentage / float string)
   * @param {number|null} val 
   * @returns {number|string}
   */
  formatMetric(val) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return Number(val.toFixed(4));
  }

  /**
   * Calculates comprehensive evaluation metrics from classified evaluation counts
   * @param {Object} rawCounts - { tp, fp, fn, partial, wrongType, duplicateCount, perTypeCounts, confusionMatrix, tokenMetrics, wrongTypePairs, partialDetails }
   * @returns {Object} Structured Evaluation Report Metrics
   */
  calculateMetrics(rawCounts) {
    const {
      tp = 0,
      fp = 0,
      fn = 0,
      partial = 0,
      wrongType = 0,
      duplicateCount = 0,
      perTypeCounts = {},
      confusionMatrix = {},
      tokenMetrics = { tpTokens: 0, fpTokens: 0, fnTokens: 0, tnTokens: 0 },
      wrongTypePairs = [],
      partialDetails = []
    } = rawCounts;

    // Overall Entity-Level Micro Metrics
    const totalPredictions = tp + fp;
    const totalGold = tp + fn;

    const microPrecision = totalPredictions > 0 ? tp / totalPredictions : null;
    const microRecall = totalGold > 0 ? tp / totalGold : null;

    let microF1 = null;
    if (typeof microPrecision === 'number' && typeof microRecall === 'number' && (microPrecision + microRecall) > 0) {
      microF1 = (2 * microPrecision * microRecall) / (microPrecision + microRecall);
    }

    // Entity-Level Accuracy: TP / (TP + FP + FN)
    const totalEvaluatedDecisions = tp + fp + fn;
    const entityAccuracy = totalEvaluatedDecisions > 0 ? tp / totalEvaluatedDecisions : null;

    // Character-Level Metrics: (TP_char + TN_char) / Total_chars
    const { tpTokens = 0, fpTokens = 0, fnTokens = 0, tnTokens = 0 } = tokenMetrics;
    const totalChars = tpTokens + tnTokens + fpTokens + fnTokens;

    const charAccuracy = totalChars > 0 ? (tpTokens + tnTokens) / totalChars : null;
    const charPrecision = (tpTokens + fpTokens) > 0 ? tpTokens / (tpTokens + fpTokens) : null;
    const charRecall = (tpTokens + fnTokens) > 0 ? tpTokens / (tpTokens + fnTokens) : null;

    let charF1 = null;
    if (typeof charPrecision === 'number' && typeof charRecall === 'number' && (charPrecision + charRecall) > 0) {
      charF1 = (2 * charPrecision * charRecall) / (charPrecision + charRecall);
    }

    // Per-Type Metrics across all 9 PII categories
    const perTypeMetrics = {};
    const fpByType = {};
    const fnByType = {};
    const partialByType = {};
    const validMacroClasses = [];

    ANNOTATION_POLICY.supportedTypes.forEach(type => {
      const counts = perTypeCounts[type] || { tp: 0, fp: 0, fn: 0, partial: 0, wrongType: 0 };
      const tTp = counts.tp;
      const tFp = counts.fp;
      const tFn = counts.fn;
      const tGoldCount = tTp + tFn;

      fpByType[type] = tFp;
      fnByType[type] = tFn;
      partialByType[type] = counts.partial;

      if (tGoldCount === 0 && tFp === 0) {
        perTypeMetrics[type] = {
          truePositives: 0,
          falsePositives: 0,
          falseNegatives: 0,
          partialMatches: counts.partial,
          wrongTypes: counts.wrongType,
          precision: 'N/A',
          recall: 'N/A',
          f1: 'N/A',
          status: 'NO_GOLD_OCCURRENCES'
        };
      } else {
        const p = (tTp + tFp) > 0 ? tTp / (tTp + tFp) : null;
        const r = tGoldCount > 0 ? tTp / tGoldCount : null;

        let f1 = null;
        if (typeof p === 'number' && typeof r === 'number' && (p + r) > 0) {
          f1 = (2 * p * r) / (p + r);
        }

        perTypeMetrics[type] = {
          truePositives: tTp,
          falsePositives: tFp,
          falseNegatives: tFn,
          partialMatches: counts.partial,
          wrongTypes: counts.wrongType,
          precision: this.formatMetric(p),
          recall: this.formatMetric(r),
          f1: this.formatMetric(f1),
          status: 'EVALUATED'
        };

        validMacroClasses.push({
          precision: typeof p === 'number' ? p : 0,
          recall: typeof r === 'number' ? r : 0,
          f1: typeof f1 === 'number' ? f1 : 0
        });
      }
    });

    // Macro Metrics (Average over classes with gold annotations or predictions)
    let macroPrecision = null;
    let macroRecall = null;
    let macroF1 = null;

    if (validMacroClasses.length > 0) {
      const sumP = validMacroClasses.reduce((acc, c) => acc + c.precision, 0);
      const sumR = validMacroClasses.reduce((acc, c) => acc + c.recall, 0);
      const sumF1 = validMacroClasses.reduce((acc, c) => acc + c.f1, 0);

      macroPrecision = sumP / validMacroClasses.length;
      macroRecall = sumR / validMacroClasses.length;
      macroF1 = sumF1 / validMacroClasses.length;
    }

    return {
      entityLevel: {
        overall: {
          truePositives: tp,
          falsePositives: fp,
          falseNegatives: fn,
          precision: this.formatMetric(microPrecision),
          recall: this.formatMetric(microRecall),
          f1: this.formatMetric(microF1),
          entityLevelAccuracy: this.formatMetric(entityAccuracy)
        },
        perType: perTypeMetrics,
        micro: {
          precision: this.formatMetric(microPrecision),
          recall: this.formatMetric(microRecall),
          f1: this.formatMetric(microF1)
        },
        macro: {
          precision: this.formatMetric(macroPrecision),
          recall: this.formatMetric(macroRecall),
          f1: this.formatMetric(macroF1),
          evaluatedClassesCount: validMacroClasses.length
        }
      },
      characterLevel: {
        tpCharacters: tpTokens,
        fpCharacters: fpTokens,
        fnCharacters: fnTokens,
        tnCharacters: tnTokens,
        characterAccuracy: this.formatMetric(charAccuracy),
        precision: this.formatMetric(charPrecision),
        recall: this.formatMetric(charRecall),
        f1: this.formatMetric(charF1)
      },
      errorBreakdown: {
        falsePositives: {
          total: fp,
          byType: fpByType
        },
        falseNegatives: {
          total: fn,
          byType: fnByType
        },
        wrongType: {
          total: wrongType,
          pairs: wrongTypePairs
        },
        partialMatches: {
          total: partial,
          byType: partialByType,
          details: partialDetails
        },
        duplicatePredictions: {
          total: duplicateCount
        }
      },
      confusionMatrix
    };
  }
}

module.exports = new MetricsCalculator();
