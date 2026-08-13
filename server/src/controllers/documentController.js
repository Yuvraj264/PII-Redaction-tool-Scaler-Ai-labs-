const documentService = require('../services/documentService');

/**
 * Document Controller
 * Handles HTTP requests for document ingestion and structured parsing.
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
        preview: previewUnits
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  parseDocument
};
