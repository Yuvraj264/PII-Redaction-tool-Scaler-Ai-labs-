const express = require('express');
const { runEvaluation, runBaselineEvaluation, runFinalEvaluation } = require('../controllers/evaluationController');

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

/**
 * @route   POST /api/evaluation/final
 * @desc    Execute final frozen evaluation run and generate final comparison artifacts
 * @access  Public
 */
router.post('/final', runFinalEvaluation);

module.exports = router;
