// src/hooks/usePresence.js
import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Track online users for a specific board.
 * @param {string} boardId - The board ID
 * @returns {Object} { onlineUsers, count }
 */
export const usePresence = (boardId) => {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState([]); // [{ userId, name, color }]

  useEffect(() => {
    if (!socket || !isConnected || !boardId) return;

    // ─── Receive initial list of current users on join ───
    const handleCurrentUsers = ({ users }) => {
      setOnlineUsers(users || []);
    };

    // ─── New user joined ───
    const handleUserJoined = ({ userId, name, color }) => {
      setOnlineUsers((prev) => {
        // Avoid duplicates
        if (prev.some((u) => u.userId === userId)) return prev;
        return [...prev, { userId, name, color }];
      });
    };

    // ─── User left ───
    const handleUserLeft = ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    socket.on('presence:currentUsers', handleCurrentUsers);
    socket.on('presence:userJoined', handleUserJoined);
    socket.on('presence:userLeft', handleUserLeft);

    return () => {
      socket.off('presence:currentUsers', handleCurrentUsers);
      socket.off('presence:userJoined', handleUserJoined);
      socket.off('presence:userLeft', handleUserLeft);
    };
  }, [socket, isConnected, boardId]);

  return {
    onlineUsers,
    count: onlineUsers.length,
  };
};