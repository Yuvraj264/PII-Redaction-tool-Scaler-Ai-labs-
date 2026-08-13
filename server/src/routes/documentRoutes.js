const express = require('express');
const { uploadDocument } = require('../controllers/documentController');
const { handleUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

/**
 * @route   POST /api/documents/upload
 * @desc    Upload DOCX file for ingestion
 * @access  Public
 */
router.post('/upload', handleUpload('file'), uploadDocument);

module.exports = router;
