const path = require('path');
const documentService = require('../../services/documentService');
const piiDetectionService = require('../../services/piiDetectionService');
const docxParserService = require('../../services/docxParserService');
const evaluationDatasetLoader = require('../loaders/evaluationDatasetLoader');
const evaluationEngine = require('../engine/evaluationEngine');
const baselineReportGenerator = require('../reports/baselineReportGenerator');
const finalComparisonGenerator = require('../reports/finalComparisonGenerator');
const goldDatasetValidator = require('../validators/goldDatasetValidator');

/**
 * Evaluator Service
 * High-level orchestrator for executing formal evaluation runs, baseline error analysis, and final freeze comparisons.
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

    // 1. Parse document text units
    const parsedDoc = await docxParserService.parseDocument(docMeta.filePath, documentId);

    // 2. Resolve and load gold annotation dataset
    const defaultDatasetPath = path.join(__dirname, '../data/prospectus_gold_dataset.json');
    const targetDatasetPath = customDatasetPath || defaultDatasetPath;

    const { dataset, validation } = evaluationDatasetLoader.loadDataset(targetDatasetPath, parsedDoc.content, docMeta.filePath);

    // Stop if dataset validation fails
    if (!validation.isValid) {
      throw new Error(`[EvaluatorService Error] Gold dataset validation failed: ${validation.errors.join('; ')}`);
    }

    // SHA-256 Source Hash check
    if (dataset.document && dataset.document.documentHash) {
      const actualHash = goldDatasetValidator.calculateFileHash(docMeta.filePath);
      if (actualHash && actualHash !== dataset.document.documentHash) {
        throw new Error(`[EvaluatorService Error] SOURCE_MISMATCH: Dataset hash '${dataset.document.documentHash}' !== actual file hash '${actualHash}'`);
      }
    }

    // 3. Execute PII detector predictions on original source document
    const detectionResult = await piiDetectionService.detectPiiInDocument(documentId);
    const predictions = detectionResult.entities || [];

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
      evaluationReport,
      predictions
    };
  }

  /**
   * Executes a baseline evaluation run and writes baseline-evaluation-result.json and baseline-evaluation-report.md
   * @param {string} documentId - Ingested document ID
   * @param {string} [customDatasetPath] - Optional path to custom gold dataset JSON file
   * @returns {Object} Baseline report paths and evaluation summary
   */
  async runBaselineEvaluation(documentId, customDatasetPath) {
    const runResult = await this.evaluateDocumentRun(documentId, customDatasetPath);
    const reportArtifacts = baselineReportGenerator.generateReports(runResult, runResult.predictions);

    return {
      success: true,
      message: 'Baseline evaluation run and error analysis completed successfully',
      artifacts: {
        jsonPath: reportArtifacts.jsonPath,
        mdPath: reportArtifacts.mdPath
      },
      result: runResult
    };
  }

  /**
   * Executes final frozen evaluation run and writes final-evaluation-result.json and final-vs-baseline-evaluation.md
   * @param {string} documentId - Ingested document ID
   * @param {string} [customDatasetPath] - Optional path to custom gold dataset JSON file
   * @returns {Object} Final comparison report paths and evaluation summary
   */
  async runFinalEvaluationAndComparison(documentId, customDatasetPath) {
    const runResult = await this.evaluateDocumentRun(documentId, customDatasetPath);
    const reportArtifacts = finalComparisonGenerator.generateFinalReports(runResult);

    return {
      success: true,
      message: 'Final frozen evaluation and baseline comparison completed successfully',
      artifacts: {
        jsonPath: reportArtifacts.jsonPath,
        mdPath: reportArtifacts.mdPath
      },
      result: runResult
    };
  }
}

module.exports = new EvaluatorService();
