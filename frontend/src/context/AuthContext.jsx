import { createContext, useContext, useState, useEffect } from 'react';
import { loginAPI, signupAPI, logoutAPI } from '../services/authService';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signup = async ({ name, email, password }) => {
    const response = await signupAPI({ name, email, password });
    const { token, ...userData } = response.data;

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    setUser(userData);

    return response;
  };

  const login = async ({ email, password }) => {
    const response = await loginAPI({ email, password });
    const { token, ...userData } = response.data;

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    setUser(userData);

    return response;
  };

  //  Logout — backend call + client cleanup
  const logout = async () => {
    try {
      // Try to invalidate token on backend (tokenVersion++)
      await logoutAPI();
    } catch (err) {
      // Even if backend fails (network error), clear local state
      console.warn('Backend logout failed, clearing local state anyway');
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};