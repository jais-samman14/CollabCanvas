const Board = require('../models/Board');
const Chat = require('../models/Chat');

//create board
const createBoard = async (req, res) => {
  try {
    const { name, canvasWidth, canvasHeight, backgroundColor } = req.body;
    const board = await Board.create({
      name: name || 'Untitled Board',
      owner: req.user._id,
      canvasWidth,
      canvasHeight,
      backgroundColor,
      strokes: [],
    });
    return res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: board,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create board',
      error: error.message,
    });
  }
};

//getallboard
const getMyBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    })
      .select('-strokes')
      .sort({ updatedAt: -1 });
    return res.status(200).json({
      success: true,
      count: boards.length,
      data: boards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch boards',
      error: error.message,
    });
  }
};

//getBoard
const getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id).populate('owner', 'name email');
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }
    const userId = req.user._id.toString();
    const isOwner = board.owner._id.toString() === userId;
    const isCollaborator = board.collaborators.some((c) => c.toString() === userId);
    if (!isOwner && !isCollaborator) {
      board.collaborators.push(req.user._id);
      await board.save();
    }
    return res.status(200).json({ success: true, data: board });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch board',
      error: error.message,
    });
  }
};

//update board
const updateBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    const userId = req.user._id.toString();
    const isOwner = board.owner.toString() === userId;
    const isCollaborator = board.collaborators.some((c) => c.toString() === userId);
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const { name, strokes, backgroundColor, canvasWidth, canvasHeight } = req.body;
    if (name !== undefined) board.name = name;
    if (strokes !== undefined) board.strokes = strokes;
    if (backgroundColor !== undefined) board.backgroundColor = backgroundColor;
    if (canvasWidth !== undefined) board.canvasWidth = canvasWidth;
    if (canvasHeight !== undefined) board.canvasHeight = canvasHeight;
    const updatedBoard = await board.save();
    return res.status(200).json({
      success: true,
      message: 'Board updated successfully',
      data: updatedBoard,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update board',
      error: error.message,
    });
  }
};

//delete board
const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can delete this board',
      });
    }
    await board.deleteOne();
    return res.status(200).json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete board',
      error: error.message,
    });
  }
};

// LEAVE BOARD (collaborator removes self)
// @route DELETE /api/boards/:id/leave
// @access Private (collaborator only — owner can't leave own board)
const leaveBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }
    const userId = req.user._id.toString();
    const isOwner = board.owner.toString() === userId;

    if (isOwner) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot leave own board. Use "End Session" instead.',
      });
    }

    const wasCollaborator = board.collaborators.some((c) => c.toString() === userId);
    if (!wasCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'You are not a collaborator on this board',
      });
    }

    board.collaborators = board.collaborators.filter((c) => c.toString() !== userId);
    await board.save();

    return res.status(200).json({
      success: true,
      message: 'You have left the board successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to leave board',
      error: error.message,
    });
  }
};

// END SESSION (owner removes all collaborators + optionally emit)
// @route DELETE /api/boards/:id/end-session
// @access Private (owner only)
const endSession = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }
    const isOwner = board.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can end the session',
      });
    }

    const removedCount = board.collaborators.length;
    board.collaborators = [];
    await board.save();

    const chatDelete = await Chat.deleteMany({ board: board._id });

    return res.status(200).json({
      success: true,
      message: `Session ended. ${removedCount} collaborator(s) removed, and chat history cleared.`,
      data: { removedCount, deletedMessages: chatDelete.deletedCount },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to end session',
      error: error.message,
    });
  }
};

module.exports = {
  createBoard,
  getMyBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  leaveBoard,      
  endSession,     
};