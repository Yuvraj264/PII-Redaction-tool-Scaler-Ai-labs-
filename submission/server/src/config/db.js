const mongoose = require('mongoose');

/**
 * Establishes connection to MongoDB database using configuration URI.
 * Implements non-blocking connection handling so the server can run in development mode
 * even if local MongoDB daemon is not currently active.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pii_redaction_db';
  
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000, // Timeout fast if DB is unavailable
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection failed: ${error.message}`);
    console.warn(`[Database Warning] Application starting without active database connection (Development Mode).`);
  }
};

module.exports = connectDB;
