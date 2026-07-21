// src/services/axiosInstance.js
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../utils/constants';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — auto-attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle common errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Session expired (tokenVersion mismatch, expired JWT, etc.)
    if (status === 401) {
      const currentPath = window.location.pathname;

      // Don't redirect on login/signup/forgot flows (expected 401s)
      const publicPaths = [
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
      ];
      const isPublicRoute = publicPaths.some((p) => currentPath.startsWith(p));

      if (!isPublicRoute) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);

        // Dispatch custom event for React to react (toast + redirect)
        window.dispatchEvent(
          new CustomEvent('session-expired', {
            detail: {
              message:
                error.response?.data?.message || 'Session expired. Please login again.',
            },
          })
        );

        // Immediate redirect if listener doesn't handle
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 100);
      }
    }

    //  Rate limit exceeded (429)
    if (status === 429) {
      window.dispatchEvent(
        new CustomEvent('rate-limit-hit', {
          detail: {
            message:
              error.response?.data?.message || 'Too many requests. Please slow down.',
          },
        })
      );
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;