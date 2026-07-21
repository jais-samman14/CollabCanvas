// src/services/chatService.js
import axiosInstance from './axiosInstance';

/**
 * Fetch chat history for a specific board.
 * @param {string} boardId - Board ID
 * @param {number} limit - Max messages to fetch (default 100)
 */
export const getChatHistoryAPI = async (boardId, limit = 100) => {
  const response = await axiosInstance.get(`/chats/${boardId}`, {
    params: { limit },
  });
  return response.data;
};