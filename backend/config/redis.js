const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 5) return false;
      return Math.min(retries * 200, 2000);
    },
  },
});

let isRedisReady = false;
let errorLogged = false;

redisClient.on('connect', () => {
  console.log('Redis connected');
});

redisClient.on('ready', () => {
  isRedisReady = true;
  errorLogged = false;
});

redisClient.on('end', () => {
  isRedisReady = false;
});

redisClient.on('error', (err) => {
  isRedisReady = false;
  if (!errorLogged) {
    console.error('Redis error:', err.message);
    errorLogged = true;
  }
});

/**
 * Establishes a connection to Redis and verifies reachability with PING.
 * @returns {Promise<void>}
 */
const connectRedis = async () => {
  await redisClient.connect();
  await redisClient.ping();
  isRedisReady = true;
};

/**
 * Returns whether the Redis client is currently connected and ready for commands.
 * @returns {boolean}
 */
const getRedisStatus = () => isRedisReady && redisClient.isOpen;

module.exports = {
  connectRedis,
  redisClient,
  getRedisStatus,
};
