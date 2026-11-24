import axiosInstance from './axiosInstance';

/**
 * Fetches all boards owned by or shared with the authenticated user.
 * @returns {Promise<object>}
 */
export const getMyBoardsAPI = async () => {
  const response = await axiosInstance.get('/boards');
  return response.data;
};

/**
 * Loads a single board's metadata and live Excalidraw scene elements by ID.
 * @param {string} id - Board ID.
 * @returns {Promise<object>}
 */
export const getBoardByIdAPI = async (id) => {
  const response = await axiosInstance.get(`/boards/${id}`);
  return response.data;
};

/**
 * Creates a new empty whiteboard.
 * @param {{ name?: string, backgroundColor?: string }} boardData
 * @returns {Promise<object>}
 */
export const createBoardAPI = async (boardData) => {
  const response = await axiosInstance.post('/boards', boardData);
  return response.data;
};

/**
 * Persists board name, appState, backgroundColor, and/or merged Excalidraw elements.
 * @param {string} id - Board ID.
 * @param {object} boardData - Fields to update.
 * @returns {Promise<object>}
 */
export const updateBoardAPI = async (id, boardData) => {
  const response = await axiosInstance.put(`/boards/${id}`, boardData);
  return response.data;
};

/**
 * Permanently deletes a board (owner only).
 * @param {string} id - Board ID.
 * @returns {Promise<object>}
 */
export const deleteBoardAPI = async (id) => {
  const response = await axiosInstance.delete(`/boards/${id}`);
  return response.data;
};

/**
 * Removes the current collaborator from a shared board.
 * @param {string} id - Board ID.
 * @returns {Promise<object>}
 */
export const leaveBoardAPI = async (id) => {
  const response = await axiosInstance.delete(`/boards/${id}/leave`);
  return response.data;
};

/**
 * Ends an active collaboration session (owner only): kicks collaborators and clears chat.
 * @param {string} id - Board ID.
 * @returns {Promise<object>}
 */
export const endSessionAPI = async (id) => {
  const response = await axiosInstance.delete(`/boards/${id}/end-session`);
  return response.data;
};

/**
 * Toggles public share-by-link access on a board (owner only).
 * @param {string} boardId - Board ID.
 * @param {boolean} [isPublic=true] - Desired sharing state.
 * @returns {Promise<object>}
 */
export const setBoardSharing = async (boardId, isPublic = true) => {
  const response = await axiosInstance.patch(`/boards/${boardId}/share`, { isPublic });
  return response.data;
};
