/**
 * Evaluation Engine Configuration
 * Default configuration parameters for ground-truth vs prediction matching and metric calculation.
 */

const EVALUATION_CONFIG = {
  matching: {
    strategy: 'exact-span-and-type',
    partialMatches: 'strict', // 'strict': partial matches contribute FP to prediction and FN to gold
    allowDuplicates: false
  },
  accuracy: {
    unit: 'character',
    mode: 'mask-projection'
  },
  display: {
    percentageDecimals: 2
  }
};

module.exports = EVALUATION_CONFIG;
