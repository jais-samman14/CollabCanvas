// src/services/boardService.js
import axiosInstance from './axiosInstance';

export const getMyBoardsAPI = async () => {
  const response = await axiosInstance.get('/boards');
  return response.data;
};

export const getBoardByIdAPI = async (id) => {
  const response = await axiosInstance.get(`/boards/${id}`);
  return response.data;
};

export const createBoardAPI = async (boardData) => {
  const response = await axiosInstance.post('/boards', boardData);
  return response.data;
};

export const updateBoardAPI = async (id, boardData) => {
  const response = await axiosInstance.put(`/boards/${id}`, boardData);
  return response.data;
};

export const deleteBoardAPI = async (id) => {
  const response = await axiosInstance.delete(`/boards/${id}`);
  return response.data;
};


export const leaveBoardAPI = async (id) => {
  const response = await axiosInstance.delete(`/boards/${id}/leave`);
  return response.data;
};


export const endSessionAPI = async (id) => {
  const response = await axiosInstance.delete(`/boards/${id}/end-session`);
  return response.data;
};

export const setBoardSharing = (boardId, isPublic = true) =>
  axiosInstance.patch(`/boards/${boardId}/share`, { isPublic });