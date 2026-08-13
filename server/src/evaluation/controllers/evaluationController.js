const evaluatorService = require('../services/evaluatorService');
const evaluationEngine = require('../engine/evaluationEngine');
const evaluationInputContract = require('../contracts/evaluationInputContract');

/**
 * Evaluation Controller
 * Handles HTTP API endpoints for executing formal PII evaluation runs.
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

module.exports = {
  runEvaluation
};
