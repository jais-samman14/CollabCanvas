const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const registerBoardHandlers = require('./boardHandlers');
const registerChatHandlers = require('./chatHandlers');

/**
 * Deterministically maps a user ID to a vibrant cursor/avatar color.
 * @param {string|object} userId - User ID.
 * @returns {string} Hex color code.
 */
const generateUserColor = (userId) => {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4',
    '#3b82f6', '#a855f7',
  ];
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Initializes Socket.IO on the HTTP server with JWT + tokenVersion handshake auth,
 * explicit 1 MB message buffer cap, and board/chat event handler registration.
 * @param {import('http').Server} httpServer - Node HTTP server.
 * @returns {import('socket.io').Server} Configured Socket.IO server instance.
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    maxHttpBufferSize: 1e6,
    cors: {
      origin: [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authenticate every WebSocket handshake with JWT + tokenVersion check
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      if (
        decoded.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion
      ) {
        return next(new Error('Session expired'));
      }

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

  io.on('connection', (socket) => {
    registerBoardHandlers(io, socket);
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
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
