const fs = require('fs');
const path = require('path');
const goldDatasetValidator = require('../validators/goldDatasetValidator');

/**
 * Evaluation Dataset Loader
 * Reads, parses, and validates JSON gold annotation datasets from disk.
 */
class EvaluationDatasetLoader {
  /**
   * Loads and validates a JSON dataset from disk
   * @param {string} datasetPath - Absolute path to JSON dataset file
   * @param {Array<Object>} [textUnits] - Optional structured document text units for validation
   * @param {string} [sourceFilePath] - Optional source DOCX path for hash check
   * @returns {Object} { dataset, validation }
   */
  loadDataset(datasetPath, textUnits, sourceFilePath) {
    if (!fs.existsSync(datasetPath)) {
      throw new Error(`[EvaluationDatasetLoader Error] Dataset file '${datasetPath}' does not exist.`);
    }

    try {
      const fileContent = fs.readFileSync(datasetPath, 'utf8');
      const dataset = JSON.parse(fileContent);

      const validation = goldDatasetValidator.validateDataset(dataset, textUnits, sourceFilePath);

      return {
        dataset,
        validation
      };
    } catch (err) {
      throw new Error(`[EvaluationDatasetLoader Error] Failed to parse JSON dataset '${datasetPath}': ${err.message}`);
    }
  }
}

module.exports = new EvaluationDatasetLoader();
