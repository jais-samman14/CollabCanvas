import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL, STORAGE_KEYS } from '../utils/constants';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect when authenticated
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket (logged out)');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Already connected? Skip
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    console.log('🔌 Establishing socket connection...');
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    // ─── Lifecycle events ───
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('🔥 Socket connect error:', err.message);
      setIsConnected(false);
    });

    newSocket.on('error', (data) => {
      console.error('⚠️ Server error:', data);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount / dep change
    return () => {
      console.log('🧹 Cleaning up socket');
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

// Custom hook — easy access
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx;
};