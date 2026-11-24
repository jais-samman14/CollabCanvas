const mongoose = require('mongoose');
const checkRateLimit = require('../middleware/socketRateLimit');
const socketLimits = require('../rateLimiter/socketLimiter');
const Board = require('../models/Board');
const sceneStore = require('../services/sceneStoreSingleton');
const { validateElements } = require('../utils/sceneValidation');

const CURSOR_MIN_INTERVAL_MS = 30; // ~33 cursor events/sec max per socket

/**
 * Registers all real-time whiteboard, presence, cursor, and session Socket.IO
 * event handlers for a connected authenticated socket.
 * @param {import('socket.io').Server} io - Socket.IO server instance.
 * @param {import('socket.io').Socket} socket - Connected client socket.
 */
const registerBoardHandlers = (io, socket) => {
  /**
   * Verifies that this socket has joined the target board's room.
   * @param {string} boardId
   * @returns {boolean}
   */
  const inRoom = (boardId) => Boolean(boardId) && socket.rooms.has(`board:${boardId}`);

  // Join board room, broadcast presence, and push authoritative live scene
  socket.on('board:join', async ({ boardId } = {}) => {
    try {
      if (!boardId || !mongoose.Types.ObjectId.isValid(boardId)) {
        return socket.emit('error', { message: 'Invalid board ID' });
      }

      const board = await Board.findById(boardId).select('owner collaborators isPublic');
      if (!board) {
        return socket.emit('error', { message: 'Board not found' });
      }
      if (!board.canAccess(socket.data.user._id)) {
        return socket.emit('error', { message: 'You do not have access to this board' });
      }

      const roomName = `board:${boardId}`;
      socket.join(roomName);
      socket.data.currentBoardId = boardId;

      socket.to(roomName).emit('presence:userJoined', {
        userId: socket.data.user._id,
        name: socket.data.user.name,
        color: socket.data.user.color,
      });

      const room = io.sockets.adapter.rooms.get(roomName);
      const memberIds = room ? Array.from(room) : [];
      const seenUsers = new Set();
      const members = [];

      for (const sid of memberIds) {
        const s = io.sockets.sockets.get(sid);
        if (s?.data?.user && !seenUsers.has(s.data.user._id)) {
          seenUsers.add(s.data.user._id);
          members.push({
            userId: s.data.user._id,
            name: s.data.user.name,
            color: s.data.user.color,
          });
        }
      }

      socket.emit('presence:currentUsers', { users: members });

      try {
        const elements = await sceneStore.getElements(boardId);
        socket.emit('scene:sync', { elements });
      } catch (err) {
        console.error('scene:sync error:', err.message);
      }
    } catch (err) {
      console.error('board:join error:', err.message);
      socket.emit('error', { message: 'Failed to join board' });
    }
  });

  // Leave board room and notify peers
  socket.on('board:leave', ({ boardId } = {}) => {
    if (!boardId) return;
    const roomName = `board:${boardId}`;
    socket.leave(roomName);
    socket.to(roomName).emit('presence:userLeft', {
      userId: socket.data.user._id,
    });
    if (socket.data.currentBoardId === boardId) {
      socket.data.currentBoardId = null;
    }
  });

  // Real-time CRDT delta sync with acknowledgment for client-side retry safety
  socket.on('scene:update', async ({ boardId, elements } = {}, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};

    const allowed = await checkRateLimit(socket, 'scene:update', socketLimits.SCENE_UPDATE);
    if (!allowed) return reply({ ok: false, reason: 'rate_limited' });
    if (!boardId || !Array.isArray(elements)) return reply({ ok: false, reason: 'invalid' });
    if (!inRoom(boardId)) return reply({ ok: false, reason: 'not_in_room' });

    const { valid, dropped, error } = validateElements(elements);
    if (error || (valid.length === 0 && elements.length > 0)) {
      return reply({ ok: false, reason: 'invalid' });
    }

    try {
      const result = await sceneStore.applyDelta(boardId, valid);
      if (result.changed.length > 0) {
        socket.to(`board:${boardId}`).emit('scene:updated', {
          elements: result.changed,
          by: { userId: socket.data.user._id, name: socket.data.user.name },
        });
      }
      reply({ ok: true, dropped: dropped + result.dropped });
    } catch (err) {
      console.error('scene:update error:', err.message);
      reply({ ok: false, reason: 'server_error' });
    }
  });

  // Owner-only board clear
  socket.on('board:clear', async ({ boardId } = {}) => {
    const allowed = await checkRateLimit(socket, 'board:clear', socketLimits.BOARD_CLEAR);
    if (!allowed || !inRoom(boardId)) return;

    const board = await Board.findById(boardId).select('owner');
    if (!board || !board.isOwner(socket.data.user._id)) {
      return socket.emit('error', { message: 'Only the board owner can clear the board' });
    }

    try {
      await sceneStore.clear(boardId);
    } catch (err) {
      console.error('board:clear error:', err.message);
      return socket.emit('error', { message: 'Failed to clear the board' });
    }

    socket.to(`board:${boardId}`).emit('board:cleared', {
      by: { userId: socket.data.user._id, name: socket.data.user.name },
    });
  });

  // Lightweight server-throttled collaborator cursor broadcast (zero Redis overhead)
  socket.on('cursor:move', ({ boardId, x, y, button } = {}) => {
    if (!inRoom(boardId)) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const now = Date.now();
    if (now - (socket.data.lastCursorAt || 0) < CURSOR_MIN_INTERVAL_MS) return;
    socket.data.lastCursorAt = now;

    socket.to(`board:${boardId}`).emit('cursor:moved', {
      userId: socket.data.user._id,
      name: socket.data.user.name,
      color: socket.data.user.color,
      x,
      y,
      button: button === 'down' ? 'down' : 'up',
    });
  });

  // Owner-only end session broadcast so collaborators redirect cleanly
  socket.on('session:end', async ({ boardId } = {}) => {
    const allowed = await checkRateLimit(socket, 'session:end', socketLimits.SESSION_END);
    if (!allowed || !inRoom(boardId)) return;

    const board = await Board.findById(boardId).select('owner');
    if (!board || !board.isOwner(socket.data.user._id)) {
      return socket.emit('error', { message: 'Only the board owner can end the session' });
    }

    io.to(`board:${boardId}`).emit('session:ended', {
      by: { userId: socket.data.user._id, name: socket.data.user.name },
    });
  });
};

module.exports = registerBoardHandlers;
