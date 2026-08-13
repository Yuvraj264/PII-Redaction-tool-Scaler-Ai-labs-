/**
 * Health Controller
 * Provides health status details for backend monitoring.
 */

const startTime = Date.now();

const getHealthStatus = (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  res.status(200).json({
    status: 'ok',
    service: 'PII Redaction Engine API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: uptimeSeconds
  });
};

module.exports = {
  getHealthStatus
};
