const { isSupportedType } = require('../policy/annotationPolicy');

/**
 * Evaluation Dataset Schema & Contract Validator
 * Validates structural syntax of gold-standard dataset objects before evaluation runs.
 */
class EvaluationDatasetSchema {
  /**
   * Validates dataset JSON structure against schema rules
   * @param {Object} dataset - Gold dataset JSON object
   * @returns {Object} { isValid, errors }
   */
  validateSchema(dataset) {
    const errors = [];

    if (!dataset || typeof dataset !== 'object') {
      return { isValid: false, errors: ['Dataset must be a valid non-null JSON object'] };
    }

    if (!dataset.datasetVersion || typeof dataset.datasetVersion !== 'string') {
      errors.push('Missing or invalid datasetVersion (string required)');
    }

    if (!dataset.document || typeof dataset.document !== 'object') {
      errors.push('Missing or invalid document metadata object');
    } else {
      if (!dataset.document.fileName || typeof dataset.document.fileName !== 'string') {
        errors.push('document.fileName is required');
      }
    }

    if (!dataset.annotationPolicy || typeof dataset.annotationPolicy !== 'object') {
      errors.push('Missing or invalid annotationPolicy object');
    }

    if (!Array.isArray(dataset.annotations)) {
      errors.push('dataset.annotations must be an array');
    } else {
      const seenIds = new Set();
      dataset.annotations.forEach((ann, idx) => {
        const prefix = `annotations[${idx}]`;

        if (!ann.id || typeof ann.id !== 'string') {
          errors.push(`${prefix}: Missing or invalid annotation ID`);
        } else {
          if (seenIds.has(ann.id)) {
            errors.push(`${prefix}: Duplicate annotation ID '${ann.id}'`);
          }
          seenIds.add(ann.id);
        }

        if (!ann.type || !isSupportedType(ann.type)) {
          errors.push(`${prefix}: Unsupported or missing PII type '${ann.type}'`);
        }

        if (typeof ann.text !== 'string' || ann.text.length === 0) {
          errors.push(`${prefix}: Missing or empty annotation text`);
        }

        if (typeof ann.start !== 'number' || ann.start < 0) {
          errors.push(`${prefix}: start offset must be a non-negative integer`);
        }

        if (typeof ann.end !== 'number' || ann.end <= ann.start) {
          errors.push(`${prefix}: end offset must be greater than start offset`);
        }

        if (!ann.source || typeof ann.source !== 'object' || !ann.source.unitId) {
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

module.exports = new EvaluationDatasetSchema();
