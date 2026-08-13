const express = require('express');
const { 
  uploadDocument, 
  parseDocument, 
  detectPii, 
  generateReplacementPlan,
  redactDocument,
  verifyRedaction,
  evaluateDocument,
  downloadRedactedDocument
} = require('../controllers/documentController');
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

/**
 * @route   POST /api/documents/:documentId/redact
 * @desc    Generate redacted DOCX file for an ingested document
 * @access  Public
 */
router.post('/:documentId/redact', redactDocument);

/**
 * @route   POST /api/documents/:documentId/verify-redaction
 * @desc    Verify post-redaction PII leakage for an ingested document
 * @access  Public
 */
router.post('/:documentId/verify-redaction', verifyRedaction);

/**
 * @route   POST /api/documents/:documentId/evaluate
 * @desc    Evaluate PII detection against a ground-truth dataset
 * @access  Public
 */
router.post('/:documentId/evaluate', evaluateDocument);

/**
 * @route   GET /api/documents/:documentId/download
 * @desc    Download the generated redacted DOCX file
 * @access  Public
 */
router.get('/:documentId/download', downloadRedactedDocument);

module.exports = router;
