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

    const summaryPayload = {
      totalEntitiesDetected: detectionResult.summary.totalEntities || 0,
      totalEntities: detectionResult.summary.totalEntities || 0,
      breakdown: {
        PERSON: detectionResult.summary.PERSON || 0,
        EMAIL: detectionResult.summary.EMAIL || 0,
        PHONE: detectionResult.summary.PHONE || 0,
        ORGANIZATION: detectionResult.summary.ORGANIZATION || 0,
        ADDRESS: detectionResult.summary.ADDRESS || 0,
        DOB: detectionResult.summary.DOB || 0,
        SSN: detectionResult.summary.SSN || 0,
        CREDIT_CARD: detectionResult.summary.CREDIT_CARD || 0,
        IP_ADDRESS: detectionResult.summary.IP_ADDRESS || 0
      },
      ...detectionResult.summary
    };

    return res.status(200).json({
      success: true,
      message: 'PII detection executed successfully',
      detection: {
        documentId: detectionResult.documentId,
        summary: summaryPayload,
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

/**
 * @desc    Generate redacted DOCX file for an ingested document
 * @route   POST /api/documents/:documentId/redact
 * @access  Public
 */
const redactDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Document ID parameter is required.'
      });
    }

    const docxRedactionService = require('../services/docxRedactionService');
    const result = await docxRedactionService.redactDocument(documentId);

    return res.status(200).json({
      success: true,
      message: 'DOCX document redacted successfully',
      redaction: {
        documentId: result.documentId,
        redactedFileName: result.redactedFileName,
        totalReplacementsApplied: result.totalReplacementsApplied,
        summary: result.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify post-redaction PII leakage for an ingested document
 * @route   POST /api/documents/:documentId/verify-redaction
 * @access  Public
 */
const verifyRedaction = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Document ID parameter is required.'
      });
    }

    const leakageScanner = require('../leakage/leakageScanner');
    const report = await leakageScanner.scanRedactedDocument(documentId);

    return res.status(200).json({
      success: true,
      message: 'Post-redaction leakage audit completed successfully',
      leakageReport: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Evaluate PII detection against a ground-truth dataset
 * @route   POST /api/documents/:documentId/evaluate
 * @access  Public
 */
const evaluateDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const path = require('path');
    const evaluationEngine = require('../evaluation/engine/evaluationEngine');
    const evaluationDatasetLoader = require('../evaluation/loaders/evaluationDatasetLoader');
    const docxParserService = require('../services/docxParserService');

    const docMeta = documentService.getDocumentMetadata(documentId);
    if (!docMeta) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: `Document '${documentId}' not found.`
      });
    }

    // 1. Detect PII predictions
    const detectionResult = await piiDetectionService.detectPiiInDocument(documentId);
    const predictions = detectionResult.entities || [];

    // 2. Parse document text units
    const parsedDoc = await docxParserService.parseDocument(docMeta.filePath, documentId);

    // 3. Load gold dataset
    const datasetPath = path.join(__dirname, '../evaluation/data/prospectus_gold_dataset.json');
    const { dataset, validation } = evaluationDatasetLoader.loadDataset(datasetPath, parsedDoc.content, docMeta.filePath);

    // 4. Run evaluation engine
    const evaluationReport = evaluationEngine.evaluate(predictions, dataset.annotations, parsedDoc.content);

    return res.status(200).json({
      success: true,
      message: 'PII detection evaluation completed successfully',
      datasetValidation: validation,
      evaluationReport
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download the generated redacted DOCX file for an ingested document
 * @route   GET /api/documents/:documentId/download
 * @access  Public
 */
const downloadRedactedDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const path = require('path');
    const fs = require('fs');

    const docMeta = documentService.getDocumentMetadata(documentId);
    let redactedBuffer = null;

    if (global.documentStore.has(documentId)) {
      const cached = global.documentStore.get(documentId);
      if (cached && cached.redactedBuffer) {
        redactedBuffer = cached.redactedBuffer;
      }
    }

    if (!redactedBuffer && docMeta && docMeta.filePath) {
      const redactedFilePath = path.join(path.dirname(docMeta.filePath), `${documentId}_redacted.docx`);
      if (fs.existsSync(redactedFilePath)) {
        try {
          redactedBuffer = fs.readFileSync(redactedFilePath);
        } catch (e) {}
      }
    }

    if (!redactedBuffer || redactedBuffer.length === 0) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: `Redacted file for document '${documentId}' does not exist. Please run redaction first.`
      });
    }

    // Inspect ZIP magic header signature (PK\x03\x04)
    if (redactedBuffer[0] !== 0x50 || redactedBuffer[1] !== 0x4B || redactedBuffer[2] !== 0x03 || redactedBuffer[3] !== 0x04) {
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Redacted file does not contain a valid ZIP magic header.'
      });
    }

    // Inspect OpenXML ZIP contents
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(redactedBuffer);
    const contentTypesEntry = zip.getEntry('[Content_Types].xml');
    const documentXmlEntry = zip.getEntry('word/document.xml');

    if (!contentTypesEntry || !documentXmlEntry) {
      return res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: 'Redacted file is missing required OpenXML entries ([Content_Types].xml or word/document.xml).'
      });
    }

    const downloadFileName = docMeta && docMeta.originalName
      ? `${docMeta.originalName.replace(/\.docx$/i, '')}_redacted.docx`
      : `${documentId}_redacted.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFileName)}"`);
    return res.send(redactedBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  parseDocument,
  detectPii,
  generateReplacementPlan,
  redactDocument,
  verifyRedaction,
  evaluateDocument,
  downloadRedactedDocument
};

