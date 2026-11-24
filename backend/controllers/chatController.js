const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Board = require('../models/Board');

/**
 * Fetches chronological chat message history for a board that the authenticated
 * user has access to (owner, collaborator, or public board).
 * @route GET /api/chats/:boardId
 */
const getChatHistory = async (req, res) => {
  try {
    const { boardId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({ success: false, message: 'Invalid board ID' });
    }

    const parsedLimit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);

    const board = await Board.findById(boardId).select('owner collaborators isPublic');
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    if (!board.canAccess(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this chat',
      });
    }

    const messages = await Chat.find({ boardId })
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .lean();

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages.reverse(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message,
    });
  }
};

module.exports = { getChatHistory };
