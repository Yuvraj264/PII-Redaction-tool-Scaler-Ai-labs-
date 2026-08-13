/**
 * System & Detector Version Configuration
 * Freezes the PII detector engine version for final evaluation and production deployment.
 */

const VERSION_CONFIG = {
  detectorVersion: '1.0.0-final',
  evaluationVersion: '1.0',
  datasetVersion: '1.0',
  redactionEngineVersion: '1.0.0',
  leakageScannerVersion: '1.0.0',
  freezeTimestamp: new Date().toISOString()
};

module.exports = VERSION_CONFIG;
