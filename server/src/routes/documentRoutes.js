const express = require('express');
const { uploadDocument, parseDocument } = require('../controllers/documentController');
const { handleUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

/**
 * @route   POST /api/documents/upload
 * @desc    Upload DOCX file for ingestion
 * @access  Public
 */
router.post('/upload', handleUpload('file'), uploadDocument);

/**
 * @route   POST /api/documents/:documentId/parse
 * @desc    Parse an ingested DOCX file and return structured document metadata
 * @access  Public
 */
router.post('/:documentId/parse', parseDocument);

module.exports = router;
