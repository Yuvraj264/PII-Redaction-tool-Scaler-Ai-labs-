const express = require('express');
const { uploadDocument, parseDocument, detectPii, generateReplacementPlan } = require('../controllers/documentController');
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
 * @desc    Detect PII entities (EMAIL, PHONE, IP, SSN, CREDIT_CARD, PERSON, ORGANIZATION, ADDRESS, DOB) in an ingested document
 * @access  Public
 */
router.post('/:documentId/detect', detectPii);

/**
 * @route   POST /api/documents/:documentId/replacement-plan
 * @desc    Generate synthetic replacement plan mapping for an ingested document
 * @access  Public
 */
router.post('/:documentId/replacement-plan', generateReplacementPlan);

module.exports = router;
