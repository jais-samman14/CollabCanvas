import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginAPI, signupAPI, logoutAPI } from '../services/authService';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

/**
 * Provides authentication state and login/signup/logout actions across the app.
 * Automatically restores persisted session data from localStorage on mount.
 * @param {{ children: import('react').ReactNode }} props
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Registers a new user and persists the returned JWT and profile. */
  const signup = useCallback(async ({ name, email, password }) => {
    const response = await signupAPI({ name, email, password });
    const { token, ...userData } = response.data;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    setUser(userData);
    return response;
  }, []);

  /** Authenticates a user and persists the returned JWT and profile. */
  const login = useCallback(async ({ email, password }) => {
    const response = await loginAPI({ email, password });
    const { token, ...userData } = response.data;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    setUser(userData);
    return response;
  }, []);

  /** Revokes the active session on the backend and clears local credentials. */
  const logout = useCallback(async () => {
    try {
      await logoutAPI();
    } catch {
      console.warn('Backend logout failed; clearing local session anyway');
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access AuthContext values. Must be used inside AuthProvider.
 * @returns {{ user: object|null, loading: boolean, isAuthenticated: boolean, signup: Function, login: Function, logout: Function }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
