const documentService = require('../services/documentService');
const piiDetectionService = require('../services/piiDetectionService');

/**
 * Document Controller
 * Handles HTTP requests for document ingestion, structured parsing, and PII detection.
 */

/**
 * @desc    Upload & ingest a DOCX document
 * @route   POST /api/documents/upload
 * @access  Public
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No file uploaded. Please attach a valid .docx document in the "file" form-data field.'
      });
    }

    const documentMetadata = documentService.processUploadedDocument(req.file);

    return res.status(200).json({
      success: true,
      message: 'Document uploaded and ingested successfully',
      document: documentMetadata
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Parse an ingested DOCX document and return structural metadata & safe preview
 * @route   POST /api/documents/:documentId/parse
 * @access  Public
 */
const parseDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Document ID parameter is required.'
      });
    }

    const structuredDoc = await documentService.parseDocument(documentId);

    // Prepare safe, limited debug preview (first 10 non-empty units with truncated text for safety)
    const previewUnits = structuredDoc.content
      .filter(u => u.normalizedText.length > 0)
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        type: u.type,
        textLength: u.text.length,
        runCount: u.runs ? u.runs.length : 0,
        location: u.location,
        previewSnippet: u.text.length > 60 ? `${u.text.substring(0, 60)}...` : u.text
      }));

    return res.status(200).json({
      success: true,
      message: 'Document parsed successfully',
      document: {
        documentId: structuredDoc.documentId,
        sourceFile: structuredDoc.sourceFile,
        metrics: structuredDoc.metrics,
        offsetConvention: structuredDoc.offsetConvention,
        preview: previewUnits
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Detect PII entities (EMAIL, PHONE, IP, SSN, CREDIT_CARD, PERSON, ORGANIZATION, ADDRESS, DOB) in an ingested DOCX document
 * @route   POST /api/documents/:documentId/detect
 * @access  Public
 */
const detectPii = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Document ID parameter is required.'
      });
    }

    const detectionResult = await piiDetectionService.detectPiiInDocument(documentId);

    // Sample entities preview (first 10 items) for safe inspection
    const sampleEntities = detectionResult.entities.slice(0, 10).map(e => ({
      type: e.type,
      start: e.start,
      end: e.end,
      detector: e.detector,
      sourceUnitId: e.source.unitId,
      sourceLocation: e.source.location
    }));

    return res.status(200).json({
      success: true,
      message: 'PII detection executed successfully',
      detection: {
        documentId: detectionResult.documentId,
        summary: detectionResult.summary,
        audit: detectionResult.audit,
        sampleCount: sampleEntities.length,
        samples: sampleEntities
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate synthetic PII replacement mapping plan for an ingested document
 * @route   POST /api/documents/:documentId/replacement-plan
 * @access  Public
 */
const generateReplacementPlan = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Document ID parameter is required.'
      });
    }

    const replacementService = require('../replacement/replacementService');
    const plan = await replacementService.generateReplacementPlan(documentId);

    // Prepare safe sample unit plans preview (first 5 unit plans with masked original details)
    const samplePlans = plan.unitPlans.slice(0, 5).map(up => ({
      unitId: up.unitId,
      unitType: up.unitType,
      location: up.location,
      replacementCount: up.replacements.length,
      sampleReplacements: up.replacements.slice(0, 3).map(r => ({
        type: r.type,
        start: r.start,
        end: r.end,
        replacement: r.replacement,
        lengthDelta: r.lengthDelta
      }))
    }));

    return res.status(200).json({
      success: true,
      message: 'Synthetic replacement plan generated successfully',
      replacementPlan: {
        documentId: plan.documentId,
        summary: plan.summary,
        sampleCount: samplePlans.length,
        samplePlans
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  parseDocument,
  detectPii,
  generateReplacementPlan
};
