const { isSupportedType } = require('../policy/annotationPolicy');

/**
 * Evaluation Input Contract Validator
 * Pure JavaScript module validating input contracts before evaluation execution.
 */
class EvaluationInputContract {
  /**
   * Validates an evaluation input payload
   * @param {Object} payload - Input payload ({ goldAnnotations, predictions, evaluationConfig })
   * @returns {Object} { isValid, errors }
   */
  validateInput(payload) {
    const errors = [];

    if (!payload || typeof payload !== 'object') {
      return { isValid: false, errors: ['Evaluation input payload must be a valid non-null object'] };
    }

    if (!Array.isArray(payload.goldAnnotations)) {
      errors.push('payload.goldAnnotations must be an array');
    } else {
      const seenGoldIds = new Set();
      payload.goldAnnotations.forEach((g, idx) => {
        const prefix = `goldAnnotations[${idx}]`;
        if (!g || typeof g !== 'object') {
          errors.push(`${prefix}: Must be a valid object`);
          return;
        }
        if (g.id) {
          if (seenGoldIds.has(g.id)) {
            errors.push(`${prefix}: Duplicate gold annotation ID '${g.id}'`);
          }
          seenGoldIds.add(g.id);
        }
        if (!g.type || !isSupportedType(g.type)) {
          errors.push(`${prefix}: Unsupported or missing entity type '${g.type}'`);
        }
        if (typeof g.start !== 'number' || g.start < 0) {
          errors.push(`${prefix}: start offset must be a non-negative integer`);
        }
        if (typeof g.end !== 'number' || g.end <= g.start) {
          errors.push(`${prefix}: end offset must be greater than start offset`);
        }
        if (!g.source || typeof g.source !== 'object' || !g.source.unitId) {
          errors.push(`${prefix}: Missing or invalid source location object with unitId`);
        }
      });
    }

    if (!Array.isArray(payload.predictions)) {
      errors.push('payload.predictions must be an array');
    } else {
      payload.predictions.forEach((p, idx) => {
        const prefix = `predictions[${idx}]`;
        if (!p || typeof p !== 'object') {
          errors.push(`${prefix}: Must be a valid object`);
          return;
        }
        if (!p.type || !isSupportedType(p.type)) {
          errors.push(`${prefix}: Unsupported or missing entity type '${p.type}'`);
        }
        if (typeof p.start !== 'number' || p.start < 0) {
          errors.push(`${prefix}: start offset must be a non-negative integer`);
        }
        if (typeof p.end !== 'number' || p.end <= p.start) {
          errors.push(`${prefix}: end offset must be greater than start offset`);
        }
        if (!p.source || typeof p.source !== 'object' || !p.source.unitId) {
          errors.push(`${prefix}: Missing or invalid source location object with unitId`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new EvaluationInputContract();
