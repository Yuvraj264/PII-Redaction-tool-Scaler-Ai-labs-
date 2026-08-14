const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { MAX_FILE_SIZE, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, UPLOAD_DIR } = require('../config/uploadConfig');

// Ensure upload directory exists securely
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer disk storage setup with sanitized unique filenames
const storage = (process.env.VERCEL || process.env.NODE_ENV === 'production')
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        const ext = path.extname(file.originalname).toLowerCase() || '.docx';
        cb(null, `doc_${uniqueSuffix}${ext}`);
      }
    });

// Strict file filter enforcing DOCX format & extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  // Validate file extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(`Unsupported file extension '${ext}'. Only .docx documents are accepted.`);
    error.statusCode = 400;
    return cb(error, false);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    const error = new Error(`Invalid file MIME type '${mime}'. Only valid DOCX files are allowed.`);
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

/**
 * Middleware wrapper around Multer single file upload to handle Multer specific errors cleanly
 */
const handleUpload = (fieldName) => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);

    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              status: 'error',
              statusCode: 413,
              message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
            });
          }
          return res.status(400).json({
            status: 'error',
            statusCode: 400,
            message: `Upload error: ${err.message}`
          });
        }
        
        return res.status(err.statusCode || 400).json({
          status: 'error',
          statusCode: err.statusCode || 400,
          message: err.message || 'File upload failed.'
        });
      }

      if (req.file && !req.file.filename) {
        const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        const ext = path.extname(req.file.originalname).toLowerCase() || '.docx';
        req.file.filename = `doc_${uniqueSuffix}${ext}`;
      }

      if (req.file && req.file.buffer && UPLOAD_DIR) {
        try {
          if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          const savePath = path.join(UPLOAD_DIR, req.file.filename);
          fs.writeFileSync(savePath, req.file.buffer);
          req.file.path = savePath;
        } catch (e) {}
      }

      next();
    });
  };
};

module.exports = {
  handleUpload
};
