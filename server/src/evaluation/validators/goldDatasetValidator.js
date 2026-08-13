const crypto = require('crypto');
const fs = require('fs');
const evaluationDatasetSchema = require('../schemas/evaluationDatasetSchema');

/**
 * Gold Dataset Validator
 * Performs deep ground-truth invariant verification against source document text units and file hashes.
 */
class GoldDatasetValidator {
  /**
   * Calculates SHA-256 hash of a file on disk
   * @param {string} filePath 
   * @returns {string} SHA-256 hex string
   */
  calculateFileHash(filePath) {
    if (!fs.existsSync(filePath)) return '';
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Validates a gold dataset against document text units and optional source file path
   * @param {Object} dataset - Gold dataset JSON object
   * @param {Array<Object>} textUnits - Array of structured document text units ({ id, text })
   * @param {string} [sourceFilePath] - Optional path to source DOCX file on disk for hash check
   * @returns {Object} { isValid, errors, summary }
   */
  validateDataset(dataset, textUnits, sourceFilePath) {
    // 1. Schema check
    const schemaValidation = evaluationDatasetSchema.validateSchema(dataset);
    if (!schemaValidation.isValid) {
      return {
        isValid: false,
        errors: schemaValidation.errors,
        summary: { totalAnnotations: 0, validAnnotations: 0 }
      };
    }

    const errors = [];
    const textUnitMap = new Map();
    if (Array.isArray(textUnits)) {
      textUnits.forEach(u => textUnitMap.set(u.id, u));
    }

    // 2. Hash check if sourceFilePath provided and documentHash exists
    if (sourceFilePath && dataset.document.documentHash) {
      const actualHash = this.calculateFileHash(sourceFilePath);
      if (actualHash && actualHash !== dataset.document.documentHash) {
        errors.push(`Document hash mismatch: Dataset hash '${dataset.document.documentHash}' !== actual file hash '${actualHash}'`);
      }
    }

    // 3. Ground-truth text & offset verification per annotation
    const unitAnnotationsMap = new Map();

    dataset.annotations.forEach((ann, idx) => {
      const unitId = ann.source.unitId;
      const unit = textUnitMap.get(unitId);

      if (!unit) {
        errors.push(`Annotation ${ann.id}: Source unit '${unitId}' not found in document`);
        return;
      }

      const unitText = unit.text || '';

      if (ann.end > unitText.length) {
        errors.push(`Annotation ${ann.id}: Offset end ${ann.end} exceeds unit text length ${unitText.length}`);
        return;
      }

      const actualSubstring = unitText.substring(ann.start, ann.end);
      if (actualSubstring !== ann.text) {
        errors.push(`Annotation ${ann.id}: Text mismatch at unit '${unitId}' [${ann.start}, ${ann.end}]: expected '${ann.text}', actual '${actualSubstring}'`);
      }

      // Check overlap with other gold annotations in same unit
      if (!unitAnnotationsMap.has(unitId)) {
        unitAnnotationsMap.set(unitId, []);
      }
      unitAnnotationsMap.get(unitId).push(ann);
    });

    // 4. Overlap verification among gold annotations
    unitAnnotationsMap.forEach((anns, unitId) => {
      for (let i = 0; i < anns.length; i++) {
        for (let j = i + 1; j < anns.length; j++) {
          const a = anns[i];
          const b = anns[j];
          if (a.start < b.end && b.start < a.end) {
            errors.push(`Overlap conflict in unit '${unitId}': Annotation ${a.id} [${a.start}, ${a.end}] overlaps with Annotation ${b.id} [${b.start}, ${b.end}]`);
          }
        }
      }
    });

    const totalAnnotations = dataset.annotations.length;
    const validAnnotations = totalAnnotations - errors.length;

    return {
      isValid: errors.length === 0,
      errors,
      summary: {
        totalAnnotations,
        validAnnotations,
        errorCount: errors.length
      }
    };
  }
}

module.exports = new GoldDatasetValidator();
