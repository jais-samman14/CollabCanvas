import axiosInstance from './axiosInstance';

/**
 * Fetches chronological chat message history for a board.
 * @param {string} boardId - Target board ID.
 * @param {number} [limit=100] - Maximum number of messages to retrieve.
 * @returns {Promise<object>}
 */
export const getChatHistoryAPI = async (boardId, limit = 100) => {
  const response = await axiosInstance.get(`/chats/${boardId}`, {
    params: { limit },
  });
  return response.data;
};
