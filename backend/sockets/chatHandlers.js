// sockets/chatHandlers.js
const Chat = require('../models/Chat');
const checkRateLimit = require("../middleware/socketRateLimit");
const socketLimits = require("../rateLimiter/socketLimiter");

const registerChatHandlers = (io, socket) => {

  // ═══════════════════════════════════════════════
  // NEW CHAT MESSAGE
  // Save to DB + broadcast to room
  // ═══════════════════════════════════════════════
  socket.on('chat:send', async ({ boardId, message }) => {
    const allowed = await checkRateLimit(socket, "chat:send", socketLimits.CHAT_SEND);
    if(!allowed) return;
    try {
      if (!boardId || !message || !message.trim()) return;
      const trimmed = message.trim().slice(0, 1000);

      // Save to database
      const chatDoc = await Chat.create({
        boardId,
        sender: socket.data.user._id,
        senderName: socket.data.user.name,
        senderColor: socket.data.user.color,
        message: trimmed,
      });

      const roomName = `board:${boardId}`;
      // Broadcast to ALL users in room (including sender for confirmation)
      io.to(roomName).emit('chat:message', {
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

  // ═══════════════════════════════════════════════
  // TYPING INDICATOR — start
  // ═══════════════════════════════════════════════
  socket.on('chat:typing:start', async ({ boardId }) => {
    const allowed = await checkRateLimit(socket, "chat:typing", socketLimits.TYPING);
    if(!allowed) return;
    if (!boardId) return;
    const roomName = `board:${boardId}`;
    socket.to(roomName).emit('chat:typing', {
      userId: socket.data.user._id,
      name: socket.data.user.name,
      isTyping: true,
    });
  });

  // ═══════════════════════════════════════════════
  // TYPING INDICATOR — stop
  // ═══════════════════════════════════════════════
  socket.on('chat:typing:stop', ({ boardId }) => {
    if (!boardId) return;
    const roomName = `board:${boardId}`;
    socket.to(roomName).emit('chat:typing', {
      userId: socket.data.user._id,
      name: socket.data.user.name,
      isTyping: false,
    });
  });

  
};

module.exports = registerChatHandlers;