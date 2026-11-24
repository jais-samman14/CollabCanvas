const mongoose = require('mongoose');
const Board = require('../models/Board');
const Chat = require('../models/Chat');
const sceneStore = require('../services/sceneStoreSingleton');
const {
  LIMITS,
  validateElements,
  sanitizeAppState,
  isValidColor,
} = require('../utils/sceneValidation');

/**
 * Validates that a route parameter is a syntactically valid MongoDB ObjectId.
 * @param {string} id - Candidate ID string.
 * @returns {boolean}
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Creates a new empty Excalidraw whiteboard owned by the authenticated user.
 * @route POST /api/boards
 */
const createBoard = async (req, res) => {
  try {
    const { name, backgroundColor } = req.body;
    const safeBg = isValidColor(backgroundColor) ? backgroundColor : '#ffffff';

    const board = await Board.create({
      name: (typeof name === 'string' && name.trim()) || 'Untitled Board',
      owner: req.user._id,
      backgroundColor: safeBg,
      elements: [],
      appState: { viewBackgroundColor: safeBg, gridSize: null },
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

/**
 * Lists all boards owned by or shared with the authenticated user (excluding heavy scene payloads).
 * @route GET /api/boards
 */
const getMyBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    })
      .select('-elements -appState')
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

/**
 * Loads a single board by ID, automatically registering the user as a collaborator
 * if the board is public, and overlaying live in-memory scene elements when present.
 * @route GET /api/boards/:id
 */
const getBoardById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid board ID' });
    }

    const board = await Board.findById(req.params.id).populate('owner', 'name email');
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const userId = req.user._id.toString();
    const isOwner = board.owner._id.toString() === userId;
    const isCollaborator = board.collaborators.some((c) => c.toString() === userId);

    if (!isOwner && !isCollaborator) {
      if (!board.isPublic) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this board',
        });
      }
      board.collaborators.push(req.user._id);
      await board.save();
    }

    // Prefer live in-memory scene so late joiners never see stale DB snapshots
    const data = board.toObject();
    const live = sceneStore.peekElements(board._id);
    if (live) data.elements = live;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch board',
      error: error.message,
    });
  }
};

/**
 * Updates board metadata and/or merges Excalidraw scene elements through sceneStore
 * using versioned CRDT LWW rules so stale tabs can never overwrite newer edits.
 * @route PUT /api/boards/:id
 */
const updateBoard = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid board ID' });
    }

    const board = await Board.findById(req.params.id).select('owner collaborators');
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const userId = req.user._id.toString();
    const isOwner = board.owner.toString() === userId;
    const isCollaborator = board.collaborators.some((c) => c.toString() === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, elements, appState, backgroundColor } = req.body;
    const set = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({ success: false, message: 'Invalid board name' });
      }
      set.name = name.trim();
    }

    if (backgroundColor !== undefined) {
      if (!isValidColor(backgroundColor)) {
        return res.status(400).json({ success: false, message: 'Invalid background color' });
      }
      set.backgroundColor = backgroundColor;
    }

    if (appState !== undefined) {
      const clean = sanitizeAppState(appState);
      set.appState = clean;
      if (clean.viewBackgroundColor && backgroundColor === undefined) {
        set.backgroundColor = clean.viewBackgroundColor;
      }
    }

    if (elements !== undefined) {
      const { valid, error } = validateElements(elements, {
        maxCount: LIMITS.MAX_ELEMENTS_PER_SAVE,
        checkSize: false,
      });
      if (error) {
        return res.status(400).json({ success: false, message: 'Invalid scene data' });
      }
      await sceneStore.applyDelta(board._id, valid);
      await sceneStore.flush(board._id);
    }

    if (Object.keys(set).length > 0) {
      await Board.updateOne({ _id: board._id }, { $set: set });
    }

    const updated = await Board.findById(board._id).select('-elements').lean();
    return res.status(200).json({
      success: true,
      message: 'Board updated successfully',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update board',
      error: error.message,
    });
  }
};

/**
 * Permanently deletes a board, evicts its live scene cache, and removes its chat history.
 * Restricted to the board owner.
 * @route DELETE /api/boards/:id
 */
const deleteBoard = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid board ID' });
    }

    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }
    if (!board.isOwner(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can delete this board',
      });
    }

    sceneStore.evict(board._id);
    await Promise.all([
      board.deleteOne(),
      Chat.deleteMany({ boardId: board._id }),
    ]);

    return res.status(200).json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete board',
      error: error.message,
    });
  }
};

/**
 * Removes the authenticated collaborator from a shared board.
 * @route DELETE /api/boards/:id/leave
 */
const leaveBoard = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid board ID' });
    }

    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const userId = req.user._id.toString();
    if (board.isOwner(userId)) {
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

/**
 * Ends an active collaboration session (owner only): removes all collaborators,
 * disables public link sharing, and clears all board chat messages.
 * @route DELETE /api/boards/:id/end-session
 */
const endSession = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid board ID' });
    }

    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }
    if (!board.isOwner(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can end the session',
      });
    }

    const removedCount = board.collaborators.length;
    board.collaborators = [];
    board.isPublic = false;
    await board.save();

    // Fixed: Chat schema stores the board reference under `boardId`, not `board`
    const chatDelete = await Chat.deleteMany({ boardId: board._id });

    return res.status(200).json({
      success: true,
      message: `Session ended. ${removedCount} collaborator(s) removed and chat history cleared.`,
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

/**
 * Enables or disables public share-by-link access on a board (owner only).
 * @route PATCH /api/boards/:id/share
 */
const toggleShare = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid board ID' });
    }

    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }
    if (!board.isOwner(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can change sharing',
      });
    }

    board.isPublic = req.body.isPublic === undefined ? true : Boolean(req.body.isPublic);
    await board.save();

    return res.status(200).json({
      success: true,
      message: board.isPublic ? 'Board is now shareable by link' : 'Link sharing disabled',
      data: { isPublic: board.isPublic },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update sharing',
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
  toggleShare,
};
