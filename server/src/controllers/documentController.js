const documentService = require('../services/documentService');

/**
 * Document Controller
 * Handles HTTP requests for document ingestion.
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

module.exports = {
  uploadDocument
};
