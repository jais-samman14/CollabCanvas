const express = require('express');
require('dns').setDefaultResultOrder('ipv4first');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { connectRedis, getRedisStatus } = require('./config/redis');
const authRoutes = require('./routes/authRoutes');
const boardRoutes = require('./routes/boardRoutes');
const chatRoutes = require('./routes/chatRoutes');
const initializeSocket = require('./sockets');
const sceneStore = require('./services/sceneStoreSingleton');

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

let isReady = false;

// Health probe for Render / load balancers
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: isReady ? 'ok' : 'starting',
    redis: getRedisStatus() ? 'connected' : 'in-memory-fallback',
    timestamp: new Date().toISOString(),
  });
});

// Gate API requests until MongoDB initialization finishes
app.use((req, res, next) => {
  if (!isReady) {
    return res
      .status(503)
      .json({ success: false, message: 'Service is starting, please retry shortly' });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/chats', chatRoutes);

// 404 fallback for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const httpServer = http.createServer(app);
const io = initializeSocket(httpServer);

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (initializing dependencies...)`);
});

/**
 * Connects MongoDB (required) and Redis (optional in development with automatic
 * in-memory fallback so local testing works out of the box).
 */
const initDependencies = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB unavailable, cannot start:', err.message);
    httpServer.close(() => process.exit(1));
    return;
  }

  try {
    await Promise.race([
      connectRedis(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connect timed out after 8s')), 8000)
      ),
    ]);
  } catch (err) {
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      console.error('Redis unavailable in production:', err.message);
      httpServer.close(() => process.exit(1));
      return;
    }
    console.warn(
      `Redis unavailable (${err.message}); using in-memory fallback for OTPs and rate limiting.`
    );
  }

  isReady = true;
  console.log(`CollabCanvas backend ready on http://localhost:${PORT}`);
};

initDependencies();

let shuttingDown = false;

/**
 * Gracefully flushes all dirty in-memory scenes to MongoDB before closing
 * Socket.IO and the HTTP server so zero recent edits are lost on restart.
 * @param {string} signal - OS termination signal name.
 */
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, flushing scenes and shutting down...`);

  const force = setTimeout(() => process.exit(1), 10000);
  force.unref();

  try {
    await sceneStore.flushAll();
  } catch (err) {
    console.error('Flush on shutdown failed:', err.message);
  }

  sceneStore.stop();
  io.close(() => httpServer.close(() => process.exit(0)));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
