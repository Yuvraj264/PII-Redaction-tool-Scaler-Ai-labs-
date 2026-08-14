const path = require('path');
const fs = require('fs');
const docxParserService = require('./docxParserService');
const { UPLOAD_DIR } = require('../config/uploadConfig');

// Global memory store for Vercel Serverless Function persistence
global.documentStore = global.documentStore || new Map();

/**
 * Document Service
 * Business logic for file ingestion metadata processing, in-memory & disk storage lookup, and structured parsing.
 */
class DocumentService {
  /**
   * Processes uploaded file metadata into a safe JSON payload and caches binary Buffer.
   * @param {Object} file - Express/Multer file object
   * @returns {Object} Safe document metadata payload
   */
  processUploadedDocument(file) {
    if (!file) {
      throw new Error('No document file provided for ingestion.');
    }

    const filename = file.filename || file.originalname || 'uploaded_doc.docx';
    const rawBaseName = path.basename(filename, path.extname(filename));
    const documentId = rawBaseName.startsWith('doc_') ? rawBaseName : `doc_${rawBaseName}`;
    const sanitizedOriginalName = path.basename(file.originalname || 'document.docx');
    const extension = path.extname(sanitizedOriginalName).toLowerCase() || '.docx';

    let fileBuffer = null;
    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      try {
        fileBuffer = fs.readFileSync(file.path);
      } catch (e) {}
    }

    const metadata = {
      documentId: documentId,
      originalName: sanitizedOriginalName,
      mimeType: file.mimetype || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: file.size || (fileBuffer ? fileBuffer.length : 0),
      extension: extension,
      uploadedAt: new Date().toISOString()
    };

    if (fileBuffer) {
      global.documentStore.set(documentId, {
        metadata,
        buffer: fileBuffer
      });
    }

    return metadata;
  }

  /**
   * Locates an ingested file in the uploads directory by document ID safely.
   * @param {string} documentId 
   * @returns {string|null} Absolute file path or null if not found
   */
  findStoredFilePath(documentId) {
    if (!documentId || typeof documentId !== 'string') return null;

    const safeDocId = path.basename(documentId);
    if (!fs.existsSync(UPLOAD_DIR)) return null;

    try {
      const files = fs.readdirSync(UPLOAD_DIR);
      const targetFile = files.find(f => {
        const base = path.basename(f, path.extname(f));
        return base === safeDocId || f === safeDocId;
      });

      if (targetFile) {
        return path.join(UPLOAD_DIR, targetFile);
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  /**
   * Retrieves document Buffer from memory store or disk
   * @param {string} documentId 
   * @returns {Buffer|null}
   */
  getDocumentBuffer(documentId) {
    if (global.documentStore.has(documentId)) {
      const cached = global.documentStore.get(documentId);
      if (cached && cached.buffer) return cached.buffer;
    }

    const filePath = this.findStoredFilePath(documentId);
    if (filePath && fs.existsSync(filePath)) {
      try {
        return fs.readFileSync(filePath);
      } catch (e) {
        return null;
      }
    }

    return null;
  }

  /**
   * Parses stored document by document ID into structured document representation
   * @param {string} documentId 
   * @returns {Object} Structured document model
   */
  async parseDocument(documentId) {
    const buffer = this.getDocumentBuffer(documentId);
    const filePath = this.findStoredFilePath(documentId);

    if (!buffer && !filePath) {
      const error = new Error(`Document with ID '${documentId}' not found in upload storage.`);
      error.statusCode = 404;
      throw error;
    }

    const sourceMeta = {
      originalName: `${documentId}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: buffer ? buffer.length : (filePath ? fs.statSync(filePath).size : 0)
    };

    return await docxParserService.parseDocument(buffer || filePath, documentId, sourceMeta);
  }

  /**
   * Verifies existence of temporary document file on disk or memory securely.
   * @param {string} filePath 
   * @returns {boolean}
   */
  verifyFileExists(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) return true;
      const base = path.basename(filePath, path.extname(filePath)).replace('_redacted', '');
      return global.documentStore.has(base);
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
    if (global.documentStore.has(documentId)) {
      const cached = global.documentStore.get(documentId);
      if (cached && cached.metadata) {
        return {
          ...cached.metadata,
          filePath: this.findStoredFilePath(documentId) || path.join(UPLOAD_DIR, `${documentId}.docx`)
        };
      }
    }

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
