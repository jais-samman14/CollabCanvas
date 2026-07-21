// src/hooks/useChat.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getChatHistoryAPI } from '../services/chatService';

const TYPING_TIMEOUT_MS = 2000;

export const useChat = (boardId, isPanelOpen) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const otherTypingTimeoutsRef = useRef({});

  // Load chat history
  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingHistory(true);
        const res = await getChatHistoryAPI(boardId);
        if (!cancelled) setMessages(res.data || []);
      } catch (err) {
        console.error('Failed to load chat history:', err.message);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Subscribe to socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isPanelOpen && msg.sender !== user?._id) {
        setUnreadCount((n) => n + 1);
      }
    };

    const onTyping = ({ userId, name, isTyping }) => {
      if (userId === user?._id) return;
      if (isTyping) {
        setTypingUsers((prev) => ({ ...prev, name }));
        if (otherTypingTimeoutsRef.current[userId]) {
          clearTimeout(otherTypingTimeoutsRef.current[userId]);
        }
        otherTypingTimeoutsRef.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, TYPING_TIMEOUT_MS + 500);
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    //  Session ended → clear all chat locally
    const onSessionEnded = () => {
      setMessages([]);
      setUnreadCount(0);
      setTypingUsers({});
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('session:ended', onSessionEnded);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('session:ended', onSessionEnded); 
    };
  }, [socket, isConnected, isPanelOpen, user]);

  useEffect(() => {
    if (isPanelOpen) setUnreadCount(0);
  }, [isPanelOpen]);

  const sendMessage = useCallback(
    (text) => {
      if (!socket || !boardId || !text?.trim()) return;
      socket.emit('chat:send', { boardId, message: text.trim() });
      if (isTypingRef.current) {
        socket.emit('chat:typing:stop', { boardId });
        isTypingRef.current = false;
        clearTimeout(typingTimeoutRef.current);
      }
    },
    [socket, boardId]
  );

  const notifyTyping = useCallback(() => {
    if (!socket || !boardId) return;
    if (!isTypingRef.current) {
      socket.emit('chat:typing:start', { boardId });
      isTypingRef.current = true;
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing:stop', { boardId });
      isTypingRef.current = false;
    }, TYPING_TIMEOUT_MS);
  }, [socket, boardId]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      Object.values(otherTypingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  return {
    messages,
    loadingHistory,
    typingUsers: Object.values(typingUsers),
    unreadCount,
    sendMessage,
    notifyTyping,
  };
};