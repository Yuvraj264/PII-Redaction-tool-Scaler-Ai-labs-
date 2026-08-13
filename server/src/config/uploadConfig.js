const path = require('path');

/**
 * Upload Configuration Constants
 * Centralized security rules and limits for document ingestion.
 */
module.exports = {
  // Maximum file size in bytes: 50MB to support large documents (e.g. 127-page RHP)
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  
  // Allowed file extensions (strictly lowercased with leading dot)
  ALLOWED_EXTENSIONS: ['.docx'],
  
  // Allowed MIME types compatible with DOCX / OpenXML format
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-zip-compressed',
    'application/zip',
    'application/octet-stream',
    'application/msword'
  ],
  
  // Temporary storage directory path
  UPLOAD_DIR: path.join(__dirname, '../../uploads')
};
