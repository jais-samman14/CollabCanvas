import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Tracks the list of currently connected users inside a board room.
 * @param {string} boardId - Active board ID.
 * @returns {{ onlineUsers: Array<{ userId: string, name: string, color: string }>, count: number }}
 */
export const usePresence = (boardId) => {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected || !boardId) return;

    const handleCurrentUsers = ({ users }) => {
      setOnlineUsers(users || []);
    };

    const handleUserJoined = ({ userId, name, color }) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === userId)) return prev;
        return [...prev, { userId, name, color }];
      });
    };

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
