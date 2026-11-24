import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../utils/constants';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach stored JWT Bearer token to every outgoing API request
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

// Globally handle 401 session expiration and 429 rate-limit responses
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
      const isPublicRoute = publicPaths.some((p) => currentPath.startsWith(p));

      if (!isPublicRoute) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);

        window.dispatchEvent(
          new CustomEvent('session-expired', {
            detail: {
              message:
                error.response?.data?.message || 'Session expired. Please login again.',
            },
          })
        );
      }
    }

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
