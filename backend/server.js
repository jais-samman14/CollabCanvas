const express = require('express');
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
connectDB();
connectRedis();

const app = express();
app.use(cors());
app.use(express.json({limit : '10mb'})); // for parsing application/json

app.get('/api/health', (req, res) => {
    res.status(200).json({
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});


app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/chats', chatRoutes);

// Create HTTP server and initialize Socket.IO
const httpServer = http.createServer(app);
const io = initializeSocket(httpServer)

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Socket.IO server ready');
});
