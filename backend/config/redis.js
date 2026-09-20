const { createClient } = require('redis');


const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
            if (retries > 10) return false;
            return Math.min(retries * 200, 3000);
        },
    },
});

redisClient.on('connect', () => {
    console.log('Redis Connected');
});

let errorLogged = false;
redisClient.on('error', (err) => {
    if (!errorLogged) {
        console.error('Redis Error:', err.message);
        errorLogged = true;
    }
});
redisClient.on('ready', () => {
    errorLogged = false;
});

const connectRedis = async () => {
    // no try/catch here — let the caller decide what a failure means
    await redisClient.connect();
    await redisClient.ping();
};

module.exports = {
    connectRedis,
    redisClient,
};