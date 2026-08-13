const express = require('express');
const { getHealthStatus } = require('../controllers/healthController');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint returning backend operational status
 * @access  Public
 */
router.get('/health', getHealthStatus);

module.exports = router;
