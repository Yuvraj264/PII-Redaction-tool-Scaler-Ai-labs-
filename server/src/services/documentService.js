const path = require('path');
const fs = require('fs');

/**
 * Document Service
 * Business logic for file ingestion metadata processing and safe storage management.
 */
class DocumentService {
  /**
   * Processes uploaded file metadata into a safe JSON payload.
   * Ensures raw server filesystem paths and document body content are NEVER returned to client.
   * 
   * @param {Object} file - Express/Multer file object
   * @returns {Object} Safe document metadata payload
   */
  processUploadedDocument(file) {
    if (!file) {
      throw new Error('No document file provided for ingestion.');
    }

    const documentId = `doc_${path.basename(file.filename, path.extname(file.filename))}`;
    const sanitizedOriginalName = path.basename(file.originalname);
    const extension = path.extname(file.originalname).toLowerCase() || '.docx';

    return {
      documentId: documentId,
      originalName: sanitizedOriginalName,
      mimeType: file.mimetype,
      size: file.size,
      extension: extension,
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Verifies existence of temporary document file on disk securely.
   * @param {string} filePath 
   * @returns {boolean}
   */
  verifyFileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new DocumentService();
