const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URL environment variable.
 * Throws on failure so server.js can perform a graceful shutdown.
 * @returns {Promise<typeof mongoose>} Active Mongoose connection instance.
 */
const connectDB = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL environment variable is not set');
  }

  const conn = await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
