import { useState, useEffect, useRef, memo } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ChatPanel.css';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '💡', '✅', '👏'];

/**
 * Formats an ISO timestamp as HH:MM for today or D/M HH:MM for earlier days.
 * @param {string|Date} dateStr
 * @returns {string}
 */
const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (isSameDay) return `${hh}:${mm}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
};

/**
 * Memoized collapsible real-time chat sidebar for a whiteboard room.
 * Displays message history, live typing indicators, and a quick-emoji composer.
 */
const ChatPanel = memo(
  ({
    isOpen,
    onClose,
    messages,
    loadingHistory,
    typingUsers,
    sendMessage,
    notifyTyping,
  }) => {
    const { user } = useAuth();
    const [input, setInput] = useState('');
    const [showEmojis, setShowEmojis] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Keep the newest message scrolled into view
    useEffect(() => {
      if (isOpen) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages, isOpen, typingUsers.length]);

    // Auto-focus message composer when sidebar opens
    useEffect(() => {
      if (!isOpen) return;
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }, [isOpen]);

    /** Submits the trimmed chat message and resets the composer. */
    const handleSend = () => {
      if (!input.trim()) return;
      sendMessage(input);
      setInput('');
      setShowEmojis(false);
    };

    /** Updates draft message text and emits throttled typing status. */
    const handleInputChange = (e) => {
      setInput(e.target.value);
      notifyTyping();
    };

    /** Appends a quick emoji to the message draft and returns focus to the input. */
    const insertEmoji = (emoji) => {
      setInput((prev) => prev + emoji);
      inputRef.current?.focus();
    };

    if (!isOpen) return null;

    return (
      <aside className="chat-panel">
        <div className="chat-panel__header">
          <div className="chat-panel__title-group">
            <span className="chat-panel__icon">💬</span>
            <h3 className="chat-panel__title">Chat</h3>
            <span className="chat-panel__count">({messages.length})</span>
          </div>
          <button
            onClick={onClose}
            className="chat-panel__close-btn"
            title="Close chat"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        <div className="chat-panel__messages">
          {loadingHistory ? (
            <div className="chat-panel__loader">
              <div className="spinner spinner-md" />
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-panel__empty">
              <div className="chat-panel__empty-icon">💬</div>
              <p className="chat-panel__empty-title">No messages yet</p>
              <p className="chat-panel__empty-sub">Say hi to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.sender === user?._id;
              const prevMsg = messages[i - 1];
              const showHeader =
                !prevMsg ||
                prevMsg.sender !== msg.sender ||
                new Date(msg.createdAt) - new Date(prevMsg.createdAt) > 5 * 60 * 1000;

              return (
                <div
                  key={msg._id || `${msg.createdAt}-${i}`}
                  className={`chat-msg-row ${
                    isMine ? 'chat-msg-row--mine' : 'chat-msg-row--other'
                  }`}
                >
                  <div className="chat-msg-group">
                    {showHeader && !isMine && (
                      <div className="chat-msg-meta">
                        <div
                          className="chat-msg-avatar"
                          style={{ backgroundColor: msg.senderColor || '#6366f1' }}
                        >
                          {msg.senderName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span
                          className="chat-msg-sender"
                          style={{ color: msg.senderColor || '#94a3b8' }}
                        >
                          {msg.senderName}
                        </span>
                        <span className="chat-msg-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    )}

                    <div
                      className={`chat-msg-bubble ${
                        isMine ? 'chat-msg-bubble--mine' : 'chat-msg-bubble--other'
                      }`}
                    >
                      {msg.message}
                    </div>

                    {isMine && (
                      <div className="chat-msg-time chat-msg-time--mine">
                        {formatTime(msg.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {typingUsers.length > 0 && (
            <div className="chat-typing">
              <div className="chat-typing__dots">
                <span className="chat-typing__dot" />
                <span className="chat-typing__dot" />
                <span className="chat-typing__dot" />
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {showEmojis && (
          <div className="chat-panel__emojis">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="chat-panel__emoji-btn"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="chat-panel__composer">
          <div className="chat-panel__composer-row">
            <button
              onClick={() => setShowEmojis((prev) => !prev)}
              className={`chat-panel__emoji-toggle ${
                showEmojis ? 'chat-panel__emoji-toggle--active' : ''
              }`}
              title="Emojis"
            >
              😊
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="chat-panel__textarea"
              maxLength={1000}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="chat-panel__send-btn"
              title="Send (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </button>
          </div>
          <div className="chat-panel__hint">Enter to send • Shift+Enter for new line</div>
        </div>
      </aside>
    );
  }
);

ChatPanel.displayName = 'ChatPanel';

export default ChatPanel;
