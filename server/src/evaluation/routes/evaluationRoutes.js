const express = require('express');
const { runEvaluation } = require('../controllers/evaluationController');

const router = express.Router();

/**
 * @route   POST /api/evaluation/run
 * @desc    Execute formal PII evaluation run comparing ground-truth gold annotations against model predictions
 * @access  Public
 */
router.post('/run', runEvaluation);

module.exports = router;
