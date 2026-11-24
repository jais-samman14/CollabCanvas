const Chat = require('../models/Chat');
const checkRateLimit = require('../middleware/socketRateLimit');
const socketLimits = require('../rateLimiter/socketLimiter');

/**
 * Registers real-time board chat and typing indicator handlers for a socket.
 * Enforces room membership so users can only message boards they have joined.
 * @param {import('socket.io').Server} io - Socket.IO server instance.
 * @param {import('socket.io').Socket} socket - Connected client socket.
 */
const registerChatHandlers = (io, socket) => {
  /**
   * Checks whether this socket has joined the target board room.
   * @param {string} boardId
   * @returns {boolean}
   */
  const inRoom = (boardId) => Boolean(boardId) && socket.rooms.has(`board:${boardId}`);

  // Persist and broadcast a new chat message to everyone in the board room
  socket.on('chat:send', async ({ boardId, message } = {}) => {
    const allowed = await checkRateLimit(socket, 'chat:send', socketLimits.CHAT_SEND);
    if (!allowed || !inRoom(boardId)) return;

    try {
      if (typeof message !== 'string' || !message.trim()) return;
      const trimmed = message.trim().slice(0, 1000);

      const chatDoc = await Chat.create({
        boardId,
        sender: socket.data.user._id,
        senderName: socket.data.user.name,
        senderColor: socket.data.user.color,
        message: trimmed,
      });

      io.to(`board:${boardId}`).emit('chat:message', {
        _id: chatDoc._id,
        boardId,
        sender: socket.data.user._id,
        senderName: socket.data.user.name,
        senderColor: socket.data.user.color,
        message: trimmed,
        createdAt: chatDoc.createdAt,
      });
    } catch (err) {
      console.error('chat:send error:', err.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Broadcast typing started indicator to other room members
  socket.on('chat:typing:start', async ({ boardId } = {}) => {
    const allowed = await checkRateLimit(socket, 'chat:typing', socketLimits.TYPING);
    if (!allowed || !inRoom(boardId)) return;

    socket.to(`board:${boardId}`).emit('chat:typing', {
      userId: socket.data.user._id,
      name: socket.data.user.name,
      isTyping: true,
    });
  });

  // Broadcast typing stopped indicator to other room members
  socket.on('chat:typing:stop', ({ boardId } = {}) => {
    if (!inRoom(boardId)) return;

    socket.to(`board:${boardId}`).emit('chat:typing', {
      userId: socket.data.user._id,
      name: socket.data.user.name,
      isTyping: false,
    });
  });
};

module.exports = registerChatHandlers;
