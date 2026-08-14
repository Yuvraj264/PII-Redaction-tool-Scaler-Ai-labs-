/**
 * Vercel Serverless Function Entry Point
 * Exports Express app for Vercel Serverless Functions environment.
 */
const app = require('../server/src/app');

module.exports = app;
