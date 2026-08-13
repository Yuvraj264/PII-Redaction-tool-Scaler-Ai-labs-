const path = require('path');
const documentService = require('../../services/documentService');
const piiDetectionService = require('../../services/piiDetectionService');
const docxParserService = require('../../services/docxParserService');
const evaluationDatasetLoader = require('../loaders/evaluationDatasetLoader');
const evaluationEngine = require('../engine/evaluationEngine');

/**
 * Evaluator Service
 * High-level orchestrator for executing formal evaluation runs on ingested documents.
 */
class EvaluatorService {
  /**
   * Executes a formal evaluation run for an ingested document against a ground-truth dataset
   * @param {string} documentId - Ingested document ID
   * @param {string} [customDatasetPath] - Optional path to custom gold dataset JSON file
   * @returns {Object} Structured Evaluation Result payload
   */
  async evaluateDocumentRun(documentId, customDatasetPath) {
    const docMeta = documentService.getDocumentMetadata(documentId);
    if (!docMeta) {
      throw new Error(`[EvaluatorService Error] Document '${documentId}' not found.`);
    }

    // 1. Execute PII detector predictions
    const detectionResult = await piiDetectionService.detectPiiInDocument(documentId);
    const predictions = detectionResult.entities || [];

    // 2. Parse document text units
    const parsedDoc = await docxParserService.parseDocument(docMeta.filePath, documentId);

    // 3. Resolve and load gold annotation dataset
    const defaultDatasetPath = path.join(__dirname, '../data/prospectus_gold_dataset.json');
    const targetDatasetPath = customDatasetPath || defaultDatasetPath;

    const { dataset, validation } = evaluationDatasetLoader.loadDataset(targetDatasetPath, parsedDoc.content, docMeta.filePath);

    // 4. Run evaluation engine
    const evaluationReport = evaluationEngine.evaluate(predictions, dataset.annotations, parsedDoc.content);

    const isPartial = dataset.status && dataset.status.includes('PARTIAL');

    return {
      evaluationVersion: '1.0',
      datasetVersion: dataset.datasetVersion || '1.0',
      status: validation.isValid ? (isPartial ? 'PARTIAL_DATASET' : 'VALID') : 'INVALID_DATASET',
      scope: {
        documentId,
        sourceFileName: docMeta.originalName,
        documentHash: dataset.document ? dataset.document.documentHash : '',
        coverage: isPartial ? 'PARTIAL' : 'FULL',
        evaluatedTextUnits: parsedDoc.content.length,
        annotationsCount: dataset.annotations.length,
        predictionsCount: predictions.length
      },
      datasetValidation: validation,
      evaluationReport
    };
  }
}

module.exports = new EvaluatorService();
