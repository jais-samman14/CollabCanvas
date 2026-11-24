import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL, STORAGE_KEYS } from '../utils/constants';

const SocketContext = createContext(null);

/**
 * Manages the authenticated Socket.IO connection lifecycle tied to the logged-in user,
 * and forwards WebSocket rate-limit notifications to the global toast listener.
 * @param {{ children: import('react').ReactNode }} props
 */
export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    if (socketRef.current?.connected) return;

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
      setIsConnected(false);
    });

    // Surface WebSocket rate limit warnings in the global toast UI
    newSocket.on('rate_limit_exceeded', (data) => {
      window.dispatchEvent(
        new CustomEvent('rate-limit-hit', {
          detail: { message: data?.message || 'Too many live events. Please slow down.' },
        })
      );
    });

    newSocket.on('disconnected_for_abuse', (data) => {
      window.dispatchEvent(
        new CustomEvent('rate-limit-hit', {
          detail: { message: data?.message || 'Disconnected due to repeated rate limit violations.' },
        })
      );
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook returning the active Socket.IO client and connection boolean.
 * @returns {{ socket: import('socket.io-client').Socket|null, isConnected: boolean }}
 */
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx;
};
