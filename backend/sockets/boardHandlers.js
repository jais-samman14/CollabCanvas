// sockets/boardHandlers.js
const checkRateLimit = require("../middleware/socketRateLimit");
const socketLimits = require("../rateLimiter/socketLimiter");
const Board = require('../models/Board');


// This function registers all the board-related socket event handlers.....
const registerBoardHandlers = (io, socket) => {

  // user is only allowed to act on a board he has actually joined
  const inRoom = (boardId) => socket.rooms.has(`board:${boardId}`);
  //join board room
    socket.on('board:join', async ({ boardId }) => {
    try {
      const board = await Board.findById(boardId).select('owner collaborators isPublic');
      if (!board) {
        return socket.emit('error', { message: 'Board not found' });
      }
      if (!board.canAccess(socket.data.user._id)) {
        console.warn(`Unauthorized join attempt: ${socket.data.user.name} → board ${boardId}`);
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
      const members = memberIds
        .map((sid) => io.sockets.sockets.get(sid))
        .filter((s) => s && s.data.user)
        .map((s) => ({
          userId: s.data.user._id,
          name: s.data.user.name,
          color: s.data.user.color,
        }));
      socket.emit('presence:currentUsers', { users: members });
      console.log(`User ${socket.data.user.name} joined board ${boardId}`);
    } catch (err) {
      console.error('board:join error:', err.message);
      socket.emit('error', { message: 'Failed to join board' });
    }
  });


  //leave board
  socket.on('board:leave', ({ boardId }) => {
    const roomName = `board:${boardId}`;
    socket.leave(roomName);
    socket.to(roomName).emit('presence:userLeft', {
      userId: socket.data.user._id,
    });
    socket.data.currentBoardId = null;
  });


  //stroke add (need rate limiting)
  socket.on('stroke:add', async ({ boardId, stroke }) => {
    const allowed = await checkRateLimit(socket, "stroke:add", socketLimits.STROKE_ADD);
    if(!allowed) return;
    if (!boardId || !stroke) return;
    if (!inRoom(boardId)) return;
    socket.to(`board:${boardId}`).emit('stroke:added', {
      stroke,
      by: { userId: socket.data.user._id, name: socket.data.user.name },
    });
  });


  //stroke update(need rate limiting)
  socket.on('stroke:update', async ({ boardId, strokeIndex, stroke }) => {
    const allowed = await checkRateLimit(socket, "stroke:update", socketLimits.STROKE_UPDATE);
    if(!allowed) return;
    if(!boardId) return;
    if (!inRoom(boardId)) return;
    socket.to(`board:${boardId}`).emit('stroke:updated', {
      strokeIndex,
      stroke,
      by: { userId: socket.data.user._id },
    });
  });


  //stroke delete(need rate limiting)
  socket.on('stroke:delete', async ({ boardId, strokeIndex }) => {
    const allowed = await checkRateLimit(socket, "stroke:delete", socketLimits.STROKE_DELETE);
    if(!allowed) return;
    if (!boardId) return;
    if (!inRoom(boardId)) return;
    socket.to(`board:${boardId}`).emit('stroke:deleted', {
      strokeIndex,
      by: { userId: socket.data.user._id },
    });
  });


  //board clear (need rate limiting)
  //board clear — owner only
  socket.on('board:clear', async ({ boardId }) => {
    const allowed = await checkRateLimit(socket, "board:clear", socketLimits.BOARD_CLEAR);
    if(!allowed) return;
    if (!boardId) return;
    if (!inRoom(boardId)) return;

    const board = await Board.findById(boardId).select('owner');
    if (!board || !board.isOwner(socket.data.user._id)) {
      return socket.emit('error', { message: 'Only the board owner can clear the board' });
    }

    socket.to(`board:${boardId}`).emit('board:cleared', {
      by: { userId: socket.data.user._id, name: socket.data.user.name },
    });
  });


  //cursor move (need rate limiting)
  socket.on('cursor:move', ({ boardId, x, y }) => {
    if (!boardId) return;
    if (!inRoom(boardId)) return;
    socket.to(`board:${boardId}`).emit('cursor:moved', {
      userId: socket.data.user._id,
      name: socket.data.user.name,
      color: socket.data.user.color,
      x,
      y,
    });
  });



  // Broadcast to all in room → clients redirect
  //  SESSION ENDED BY OWNER — owner only
  socket.on('session:end', async ({ boardId }) => {
    const allowed = await checkRateLimit(socket, "session:end", socketLimits.SESSION_END);
    if(!allowed) return;
    if (!boardId) return;
    if (!inRoom(boardId)) return;

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