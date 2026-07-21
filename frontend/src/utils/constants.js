// src/utils/constants.js
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

export const STORAGE_KEYS = {
  TOKEN: 'collabcanvas_token',
  USER: 'collabcanvas_user',
};

export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  BOARD: '/board/:id',
};