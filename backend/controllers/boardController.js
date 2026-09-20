const Board = require('../models/Board');
const Chat = require('../models/Chat');

// create board : when user click on "New Board"
// agar login hoga tbhi createBoard kar skta hai....(all are protected routes)
// @route (POST method) '/api/boards'
const createBoard = async (req, res) => {
  try {
    const { name, canvasWidth, canvasHeight, backgroundColor } = req.body;
    //Board.create() : mongoose method to create a document inside a Board Collection(validate krta h schema ke against)
    //CRETAED document return krta hai (_id with timestamps)
    const board = await Board.create({
      name: name || 'Untitled Board',
      owner: req.user._id,
      canvasWidth,
      canvasHeight,
      backgroundColor,
      strokes: [],//fresh board me empty array no drawing
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

//get All boards : like when user come to dashboard it fetches all the board for that particular user
// @route (GET Method) '/api/boards'
const getMyBoards = async (req, res) => {
  try {
    //Board.find() -> find all document of the user
    const boards = await Board.find({
      //means search boards where owner is "curr_user" or collaborator is "curr_user"...do queries simultaneously(1 query fast)
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    })
      .select('-strokes') //exclude strokes (not neede strokes right now , want it later when user open board)
      .sort({ updatedAt: -1 }); //latest board first aayega..

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
//fetch data of specific board...when user click on specific board tile
// @route (GET Method) '/api/boards/:id'
const getBoardById = async (req, res) => {
  try {
    // .populate('owner')-> means expand owner field (mtlb User collection me dekhega aur [name , email] dega)
    // owner ek object bn jayega(jiske andr [_id, name, email] hoga)
    const board = await Board.findById(req.params.id).populate('owner', 'name email');//here N+1 query problem solve krta h
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found' });
    }

    const userId = req.user._id.toString();
    const isOwner = board.owner._id.toString() === userId;
    const isCollaborator = board.collaborators.some((c) => c.toString() === userId);

    if (!isOwner && !isCollaborator) {
        if (!board.isPublic) {
            return res.status(403).json({ success: false, message: 'You do not have access to this board' });
        }
        // public board — join as collaborator
        board.collaborators.push(req.user._id);
        await board.save();
    }
    //now return board data
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
//jab bhi board me stroke change hota hai board update hota h
// @routes PUT ('/api/boards/:id')
// we are using put because we are replacing full board object............patch(existing me change krta h)
const updateBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });

    //kewal user aur collabrator hi update krr skte h board ko..
    const userId = req.user._id.toString();
    const isOwner = board.owner.toString() === userId;
    const isCollaborator = board.collaborators.some((c) => c.toString() === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    //abb jo jo update aa rha h req.body se woh lo aur db me update kro
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
//when user click on delete the board must get deleted
// @route DELETE('/api/boards/:id')
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

// leave BOARD (collaborator removes self)
// @route DELETE /api/boards/:id/leave
// Private (collaborator only — owner can't leave own board)
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
    //filter(naya array return krega) remove out this board_id from board.collabrators array
    board.collaborators = board.collaborators.filter((c) => c.toString() !== userId);
    await board.save();//save to db

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
// Private (owner only)
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
    //remove all collaborators
    const removedCount = board.collaborators.length;
    board.collaborators = [];
    board.isPublic = false; // also disable public sharing when session ends
    await board.save();

    //deleted all chats
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

// toggle sharing — owner only
// @route PATCH /api/boards/:id/share
const toggleShare = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: 'Board not found' });

    if (!board.isOwner(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the owner can change sharing' });
    }

    board.isPublic = req.body.isPublic === undefined ? true : Boolean(req.body.isPublic);
    await board.save();

    return res.status(200).json({
      success: true,
      message: board.isPublic ? 'Board is now shareable by link' : 'Link sharing disabled',
      data: { isPublic: board.isPublic },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update sharing', error: error.message });
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