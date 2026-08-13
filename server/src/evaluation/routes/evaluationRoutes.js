const express = require('express');
const { runEvaluation, runBaselineEvaluation } = require('../controllers/evaluationController');

const router = express.Router();

/**
 * @route   POST /api/evaluation/run
 * @desc    Execute formal PII evaluation run comparing ground-truth gold annotations against model predictions
 * @access  Public
 */
router.post('/run', runEvaluation);

/**
 * @route   POST /api/evaluation/baseline
 * @desc    Execute baseline evaluation run and generate baseline report artifacts
 * @access  Public
 */
router.post('/baseline', runBaselineEvaluation);

module.exports = router;
