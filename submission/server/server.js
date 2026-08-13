require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5001;

// Initialize Database connection (non-blocking)
connectDB();

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` PII Redaction Engine Server Started`);
  console.log(` Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(` Server Port : ${PORT}`);
  console.log(` Health API  : http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection Error]: ${err.message}`);
  // In production, server might gracefully shutdown here
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`[Uncaught Exception Error]: ${err.message}`);
  process.exit(1);
});
