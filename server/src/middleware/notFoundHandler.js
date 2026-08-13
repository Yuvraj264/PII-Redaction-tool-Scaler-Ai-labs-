/**
 * 404 Not Found Middleware
 * Catches requests to unmapped routes and returns a structured JSON error response.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found.`
  });
};

module.exports = notFoundHandler;
