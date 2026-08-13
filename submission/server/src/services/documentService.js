const path = require('path');
const fs = require('fs');
const docxParserService = require('./docxParserService');
const { UPLOAD_DIR } = require('../config/uploadConfig');

/**
 * Document Service
 * Business logic for file ingestion metadata processing, storage lookup, and structured parsing.
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

    const rawBaseName = path.basename(file.filename, path.extname(file.filename));
    const documentId = rawBaseName.startsWith('doc_') ? rawBaseName : `doc_${rawBaseName}`;
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
   * Locates an ingested file in the uploads directory by document ID safely.
   * @param {string} documentId 
   * @returns {string|null} Absolute file path or null if not found
   */
  findStoredFilePath(documentId) {
    if (!documentId || typeof documentId !== 'string') return null;

    // Sanitize documentId against path traversal
    const safeDocId = path.basename(documentId);
    
    if (!fs.existsSync(UPLOAD_DIR)) return null;

    const files = fs.readdirSync(UPLOAD_DIR);
    
    // Match file whose name starts with safeDocId or matches safeDocId directly
    const targetFile = files.find(f => {
      const base = path.basename(f, path.extname(f));
      return base === safeDocId || f === safeDocId;
    });

    if (!targetFile) return null;

    return path.join(UPLOAD_DIR, targetFile);
  }

  /**
   * Parses stored document by document ID into structured document representation
   * @param {string} documentId 
   * @returns {Object} Structured document model
   */
  async parseDocument(documentId) {
    const filePath = this.findStoredFilePath(documentId);

    if (!filePath) {
      const error = new Error(`Document with ID '${documentId}' not found in upload storage.`);
      error.statusCode = 404;
      throw error;
    }

    const stats = fs.statSync(filePath);
    const sourceMeta = {
      originalName: `${documentId}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: stats.size
    };

    return await docxParserService.parseDocument(filePath, documentId, sourceMeta);
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

  /**
   * Retrieves document metadata object by document ID
   * @param {string} documentId 
   * @returns {Object|null} { documentId, filePath, originalName, size }
   */
  getDocumentMetadata(documentId) {
    const filePath = this.findStoredFilePath(documentId);
    if (!filePath) return null;
    const stats = fs.statSync(filePath);
    return {
      documentId,
      filePath,
      originalName: `${documentId}.docx`,
      size: stats.size
    };
  }
}

module.exports = new DocumentService();
