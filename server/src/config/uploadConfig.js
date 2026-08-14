const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Upload Configuration Constants
 * Centralized security rules and limits for document ingestion.
 * Automatically handles Vercel / serverless ephemeral /tmp storage.
 */
const defaultDir = process.env.VERCEL || process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'pii-uploads')
  : path.join(__dirname, '../../uploads');

try {
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
} catch (err) {
  // Directory fallback
}

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
  UPLOAD_DIR: defaultDir
};
