// src/components/chat/ChatPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '💡', '✅', '👏'];

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (isSameDay) return `${hh}:${mm}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
};

const ChatPanel = ({
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, typingUsers.length]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
    setShowEmojis(false);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    notifyTyping();
  };

  const insertEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 bg-canvas-surface border-l border-canvas-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-canvas-border flex items-center justify-between bg-canvas-bg/40">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="font-semibold">Chat</h3>
          <span className="text-xs text-slate-500">
            ({messages.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition text-xl leading-none"
          title="Close chat"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 mt-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Say hi to start the conversation!</p>
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
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${isMine ? 'items-end' : 'items-start'}`}>
                  {showHeader && !isMine && (
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: msg.senderColor || '#6366f1' }}
                      >
                        {msg.senderName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: msg.senderColor || '#94a3b8' }}
                      >
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm break-words ${
                      isMine
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-canvas-bg border border-canvas-border text-slate-100 rounded-tl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                  {isMine && (
                    <div className="text-[10px] text-slate-500 mt-0.5 text-right">
                      {formatTime(msg.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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

      {/* Emoji picker */}
      {showEmojis && (
        <div className="px-3 py-2 border-t border-canvas-border bg-canvas-bg/40 flex gap-1 flex-wrap">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              className="w-8 h-8 rounded-lg hover:bg-canvas-border transition text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-canvas-border bg-canvas-bg/40">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className={`p-2 rounded-lg transition ${
              showEmojis
                ? 'bg-primary/20 text-primary'
                : 'text-slate-400 hover:text-white'
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
            className="flex-1 bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary resize-none max-h-24"
            maxLength={1000}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-primary hover:bg-primary-dark disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition text-white"
            title="Send (Enter)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-slate-500 mt-1.5 px-1">
          Enter to send • Shift+Enter for new line
        </div>
      </div>
    </aside>
  );
};

export default ChatPanel;