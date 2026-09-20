// sockets/index.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const registerBoardHandlers = require('./boardHandlers');
const registerChatHandlers = require('./chatHandlers');

// Generate a persistent color for user (for cursor + chat)
const generateUserColor = (userId) => {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4',
    '#3b82f6', '#a855f7',
  ];
  // Hash userId string to pick consistent color
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
};

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ═══════════════════════════════════════════════
  // AUTHENTICATION MIDDLEWARE
  // Every socket must authenticate via JWT token
  // ═══════════════════════════════════════════════
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }
      if(decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion){
        return next(new Error("Session Expired"));
      }

      // Attach user info + persistent color to socket.data
      socket.data.user = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        color: generateUserColor(user._id),
      };
      
      socket.data.violations = 0;
      next();

    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Invalid or expired token'));
    }
  });

  // ═══════════════════════════════════════════════
  // CONNECTION HANDLER
  // ═══════════════════════════════════════════════
  io.on('connection', (socket) => {
    console.log(`🟢 Socket connected: ${socket.data.user.name} (${socket.id})`);

    // Register all event handlers for this socket
    registerBoardHandlers(io, socket);
    registerChatHandlers(io, socket);

    // ─────────────────────────────
    // DISCONNECT — cleanup + notify
    // ─────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔴 Socket disconnected: ${socket.data.user.name}`);
      const boardId = socket.data.currentBoardId;
      if (boardId) {
        socket.to(`board:${boardId}`).emit('presence:userLeft', {
          userId: socket.data.user._id,
          name: socket.data.user.name,
        });
      }
    });
  });

  return io;
};

module.exports = initializeSocket;