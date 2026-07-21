// controllers/chatController.js
const Chat = require('../models/Chat');
const Board = require('../models/Board');

// @desc    Get chat history for a board
// @route   GET /api/chats/:boardId
// @access  Private (owner or collaborator)
const getChatHistory = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { limit = 100 } = req.query;

    // Verify board access
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    const isOwner = board.owner.toString() === req.user._id.toString();
    const isCollaborator = board.collaborators.some(
      (c) => c.toString() === req.user._id.toString()
    );

    if (!isOwner && !isCollaborator && !board.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this chat',
      });
    }

    // Fetch messages, newest first, then reverse for chronological display
    const messages = await Chat.find({ boardId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
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