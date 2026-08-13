const evaluatorService = require('../services/evaluatorService');
const evaluationEngine = require('../engine/evaluationEngine');
const evaluationInputContract = require('../contracts/evaluationInputContract');

/**
 * Evaluation Controller
 * Handles HTTP API endpoints for executing formal PII evaluation runs, baseline error analysis, and final freeze comparison.
 */

/**
 * @desc    Execute a formal evaluation run for an ingested document or raw input arrays
 * @route   POST /api/evaluation/run
 * @access  Public
 */
const runEvaluation = async (req, res, next) => {
  try {
    const { documentId, goldAnnotations, predictions, textUnits } = req.body || {};

    // 1. Document ID based evaluation run
    if (documentId) {
      const evaluationResult = await evaluatorService.evaluateDocumentRun(documentId);
      return res.status(200).json({
        success: true,
        message: 'Formal PII evaluation run completed successfully',
        result: evaluationResult
      });
    }

    // 2. Raw inputs based evaluation run
    if (Array.isArray(goldAnnotations) && Array.isArray(predictions)) {
      const contractValidation = evaluationInputContract.validateInput({ goldAnnotations, predictions });
      if (!contractValidation.isValid) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'Invalid evaluation input contract',
          errors: contractValidation.errors
        });
      }

      const evaluationReport = evaluationEngine.evaluate(predictions, goldAnnotations, textUnits || []);

      return res.status(200).json({
        success: true,
        message: 'Raw inputs formal PII evaluation completed successfully',
        result: {
          evaluationVersion: '1.0',
          status: 'VALID',
          scope: {
            mode: 'raw-inputs',
            annotationsCount: goldAnnotations.length,
            predictionsCount: predictions.length
          },
          evaluationReport
        }
      });
    }

    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Please provide either a valid "documentId" or both "goldAnnotations" and "predictions" arrays.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Execute a baseline evaluation run and generate baseline reports
 * @route   POST /api/evaluation/baseline
 * @access  Public
 */
const runBaselineEvaluation = async (req, res, next) => {
  try {
    const { documentId, datasetPath } = req.body || {};

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Document ID parameter "documentId" is required in request body.'
      });
    }

    const baselineResult = await evaluatorService.runBaselineEvaluation(documentId, datasetPath);

    return res.status(200).json({
      success: true,
      message: 'Baseline evaluation run and error analysis completed successfully',
      result: baselineResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Execute final frozen evaluation run and baseline comparison
 * @route   POST /api/evaluation/final
 * @access  Public
 */
const runFinalEvaluation = async (req, res, next) => {
  try {
    const { documentId, datasetPath } = req.body || {};

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Document ID parameter "documentId" is required in request body.'
      });
    }

    const finalResult = await evaluatorService.runFinalEvaluationAndComparison(documentId, datasetPath);

    return res.status(200).json({
      success: true,
      message: 'Final evaluation run and baseline comparison completed successfully',
      result: finalResult
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runEvaluation,
  runBaselineEvaluation,
  runFinalEvaluation
};
