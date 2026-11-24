const express = require('express');
const router = express.Router();
const {
  createBoard,
  getMyBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  leaveBoard,
  endSession,
  toggleShare,
} = require('../controllers/boardController');
const protect = require('../middleware/authMiddleware');
const {
  createBoardLimiter,
  deleteBoardLimiter,
} = require('../rateLimiter/apiLimiter');

router.use(protect);

router.route('/').post(createBoardLimiter, createBoard).get(getMyBoards);
router
  .route('/:id')
  .get(getBoardById)
  .put(updateBoard)
  .delete(deleteBoardLimiter, deleteBoard);

router.patch('/:id/share', toggleShare);
router.delete('/:id/leave', leaveBoard);
router.delete('/:id/end-session', endSession);

module.exports = router;
