const express = require('express');
const { uploadDocument, parseDocument, detectPii } = require('../controllers/documentController');
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

/**
 * @route   POST /api/documents/:documentId/detect
 * @desc    Detect PII entities (EMAIL, PHONE, IP, SSN, CREDIT_CARD) in an ingested document
 * @access  Public
 */
router.post('/:documentId/detect', detectPii);

module.exports = router;
