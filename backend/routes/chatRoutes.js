// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { getChatHistory } = require('../controllers/chatController');
const protect = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/chats/:boardId → Get chat history for a board
router.get('/:boardId', getChatHistory);

module.exports = router;