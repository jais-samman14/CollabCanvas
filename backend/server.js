const express = require('express');
require('dns').setDefaultResultOrder('ipv4first');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const {connectRedis} = require('./config/redis');
const authRoutes = require('./routes/authRoutes');
const boardRoutes = require('./routes/boardRoutes');
const chatRoutes = require('./routes/chatRoutes');
const initializeSocket = require('./sockets');
    
dotenv.config();

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({limit : '10mb'})); // for parsing application/json

let isReady = false;

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: isReady ? 'ok' : 'starting',
        timestamp: new Date().toISOString(),
    });
});

app.use((req, res, next) => {
    if (!isReady) {
        return res.status(503).json({ message: 'Service is starting, please retry in a few seconds' });
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/chats', chatRoutes);

// Create HTTP server and initialize Socket.IO
const httpServer = http.createServer(app);
const io = initializeSocket(httpServer)

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}, but not ready yet`);
});

(async function init() {
    // MongoDB and Redis are both hard dependencies here:
    // the data lives in Mongo, and rate limiting + OTP storage run on Redis
    try {
        await connectDB();
        console.log('MongoDB ready');
    } catch (err) {
        console.error('MongoDB unavailable, cannot start:', err.message);
        httpServer.close(() => process.exit(1));
        return;
    }

    try {
        await Promise.race([
            connectRedis(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Redis connect timed out after 12s')), 12000)
            )
        ]);
        console.log('Redis ready');
    } catch (err) {
        console.error('Redis unavailable, cannot start:', err.message);
        httpServer.close(() => process.exit(1));
        return;
    }

    isReady = true;
    console.log('🚀 Server is now ready to accept traffic');
})();