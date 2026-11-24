import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getChatHistoryAPI } from '../services/chatService';

const TYPING_TIMEOUT_MS = 2000;

/**
 * Manages board chat history, real-time incoming messages, unread badge count,
 * and per-user typing indicators keyed cleanly by userId.
 * @param {string} boardId - Active board ID.
 * @param {boolean} isPanelOpen - Whether the chat sidebar is currently visible.
 * @returns {{ messages: object[], loadingHistory: boolean, typingUsers: string[], unreadCount: number, sendMessage: Function, notifyTyping: Function }}
 */
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
  const isPanelOpenRef = useRef(isPanelOpen);

  useEffect(() => {
    isPanelOpenRef.current = isPanelOpen;
    if (isPanelOpen) setUnreadCount(0);
  }, [isPanelOpen]);

  // Fetch initial chat history from MongoDB
  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;

    const loadHistory = async () => {
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

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Subscribe to real-time chat events without tearing down listeners when panel toggles
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isPanelOpenRef.current && msg.sender !== user?._id) {
        setUnreadCount((n) => n + 1);
      }
    };

    const onTyping = ({ userId, name, isTyping }) => {
      if (!userId || userId === user?._id) return;

      if (isTyping) {
        // Fixed: key by [userId] so multiple typers never overwrite each other and cleanup works
        setTypingUsers((prev) => ({ ...prev, [userId]: name }));
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
        clearTimeout(otherTypingTimeoutsRef.current[userId]);
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

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
  }, [socket, isConnected, user]);

  /** Sends a trimmed chat message and clears the local typing state. */
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

  /** Emits debounced typing start/stop events while the user composes a message. */
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
