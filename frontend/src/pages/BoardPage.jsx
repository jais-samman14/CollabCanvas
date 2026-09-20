// src/pages/BoardPage.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { useCanvas } from '../hooks/useCanvas';
import { useCollab } from '../hooks/useCollab';
import { usePresence } from '../hooks/usePresence';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Toolbar from '../components/canvas/ToolBar';
import CanvasBoard from '../components/canvas/CanvasBoard';
import CursorOverlay from '../components/canvas/CursorOverlay';
import PresenceBar from '../components/canvas/PresenceBar';
import ChatPanel from '../components/chat/ChatPanel';
import {
  getBoardByIdAPI,
  updateBoardAPI,
  leaveBoardAPI,
  endSessionAPI,
  setBoardSharing,
} from '../services/boardService';
import { throttle } from '../utils/throttle';

const BoardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await getBoardByIdAPI(id);
        if (!cancelled) setBoard(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load board');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-73px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-73px)]">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold mb-2">{error}</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-6 py-2 bg-primary hover:bg-primary-dark rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <BoardEditor board={board} boardId={id} />;
};

const BoardEditor = ({ board, boardId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [boardName, setBoardName] = useState(board.name);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [remoteCursors, setRemoteCursors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // End collab confirm state
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  const ownerId = board.owner?._id?.toString() || board.owner?.toString();
  const isOwner = user?._id?.toString() === ownerId;

  const { onlineUsers } = usePresence(boardId);

  const pushToast = useCallback((msg, type = 'info') => {
    const tid = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id: tid, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== tid));
    }, 3000);
  }, []);

  const canvasRefContainer = useRef(null);

  const collabHandlers = useMemo(
    () => ({
      onStrokeAdded: ({ stroke }) =>
        canvasRefContainer.current?.applyRemoteStrokeAdd?.(stroke),
      onStrokeUpdated: ({ strokeIndex, stroke }) =>
        canvasRefContainer.current?.applyRemoteStrokeUpdate?.(strokeIndex, stroke),
      onStrokeDeleted: ({ strokeIndex }) =>
        canvasRefContainer.current?.applyRemoteStrokeDelete?.(strokeIndex),
      onBoardCleared: ({ by }) => {
        canvasRefContainer.current?.applyRemoteClear?.();
        pushToast(`${by?.name || 'Someone'} cleared the board`, 'warning');
      },
      onCursorMoved: ({ userId, name, color, x, y }) => {
        setRemoteCursors((prev) => ({
          ...prev,
          [userId]: { name, color, x, y },
        }));
      },
    }),
    []
  );

  const collab = useCollab(boardId, collabHandlers);

  const throttledCollab = useMemo(
    () => ({
      ...collab,
      emitCursorMove: throttle(collab.emitCursorMove, 50),
    }),
    [collab]
  );

  const canvas = useCanvas(
    board.strokes || [],
    board.backgroundColor || '#ffffff',
    board.canvasWidth || 4000,
    board.canvasHeight || 2500,
    throttledCollab
  );

  useEffect(() => {
    canvasRefContainer.current = canvas;
  }, [canvas]);

  const chat = useChat(boardId, isChatOpen);

  // Listen for session:ended broadcast
  useEffect(() => {
    if (!socket) return;
    const handleSessionEnded = ({ by }) => {
      if (isOwner) {
        // Owner initiated — already handled locally
        return;
      }
      pushToast(`⚠️ ${by?.name || 'Owner'} ended the session`, 'warning');
      // Give user 2 sec to see the toast, then redirect
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    };
    socket.on('session:ended', handleSessionEnded);
    return () => socket.off('session:ended', handleSessionEnded);
  }, [socket, isOwner, navigate, pushToast]);

  // Server-side rejections (authorization, rate limit) —
  // surface them instead of letting the action fail silently
  useEffect(() => {
    if (!socket) return;
    const handleServerError = ({ message }) => {
      pushToast(`⚠️ ${message}`, 'warning');
    };
    socket.on('error', handleServerError);
    return () => socket.off('error', handleServerError);
  }, [socket, pushToast]);

  // Presence toasts
  const [prevUsers, setPrevUsers] = useState([]);
  useEffect(() => {
    const prevIds = new Set(prevUsers.map((u) => u.userId));
    const currIds = new Set(onlineUsers.map((u) => u.userId));
    onlineUsers.forEach((u) => {
      if (!prevIds.has(u.userId) && u.userId !== user?._id) {
        pushToast(`👋 ${u.name} joined`, 'info');
      }
    });
    prevUsers.forEach((u) => {
      if (!currIds.has(u.userId)) {
        if (u.userId !== user?._id) pushToast(`👋 ${u.name} left`, 'info');
        setRemoteCursors((prev) => {
          const next = { ...prev };
          delete next[u.userId];
          return next;
        });
      }
    });
    setPrevUsers(onlineUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineUsers]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveStatus('unsaved');
  }, [canvas.strokes, canvas.bgColor, boardName, canvas.dimensions]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setSaveStatus('saving');
      await updateBoardAPI(boardId, {
        name: boardName,
        strokes: canvas.strokes,
        backgroundColor: canvas.bgColor,
        canvasWidth: canvas.dimensions.width,
        canvasHeight: canvas.dimensions.height,
      });
      setSaveStatus('saved');
    } catch (err) {
      pushToast('❌ Failed to save', 'warning');
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  }, [boardId, boardName, canvas.strokes, canvas.bgColor, canvas.dimensions, pushToast]);

  useEffect(() => {
    if (!isOwner) return;
    if (saveStatus !== 'unsaved') return;
    const timer = setTimeout(() => handleSave(), 3000);
    return () => clearTimeout(timer);
  }, [saveStatus, handleSave, isOwner]);

  useEffect(() => {
    if (!isOwner) return;
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus, isOwner]);

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };
    const handleKey = (e) => {
      if (isTyping()) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'c') { e.preventDefault(); canvas.copySelected(); return; }
      if (meta && e.key === 'v' && !e.shiftKey) { e.preventDefault(); canvas.paste(); return; }
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); canvas.undo(); return; }
      if (meta && e.key === 'z' && e.shiftKey) { e.preventDefault(); canvas.redo(); return; }
      if (meta && e.key === 's') { e.preventDefault(); handleSave(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvas.selectedIndex !== null) {
          e.preventDefault();
          canvas.deleteSelected();
        }
        return;
      }
      if (e.key === 'Escape') { canvas.deselect(); return; }
      if (e.key === 'v' && !meta) canvas.setTool('select');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canvas, handleSave]);

  const handleExportPNG = () => {
    const c = canvas.canvasRef.current;
    if (!c) return;
    const link = document.createElement('a');
    link.download = `${boardName || 'board'}.png`;
    link.href = c.toDataURL('image/png');
    link.click();
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const c = canvas.canvasRef.current;
    if (!c) return;
    const imgData = c.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: c.width > c.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [c.width, c.height],
      compress: true,
    });
    pdf.addImage(imgData, 'PNG', 0, 0, c.width, c.height);
    pdf.save(`${boardName || 'board'}.pdf`);
    setShowExportMenu(false);
  };

  // Clear is owner-only. Guard locally too, otherwise a collaborator's canvas
  // clears while the server rejects the broadcast — leaving the clients diverged.
  const handleClearAll = useCallback(() => {
    if (!isOwner) {
      pushToast('⚠️ Only the board owner can clear the board', 'warning');
      return;
    }
    canvas.clearAll();
  }, [isOwner, canvas, pushToast]);

  const handleShareLink = async () => {
    try {
      if (isOwner) {
        await setBoardSharing(boardId, true);
      }
      navigator.clipboard.writeText(window.location.href);
      pushToast('🔗 Share link copied — anyone with the link can now join', 'success');
    } catch (err) {
      pushToast('Failed to enable sharing', 'warning');
    }
  };

  // END COLLABORATION HANDLERS
  const handleEndCollab = async () => {
    try {
      setEndingSession(true);
      if (isOwner) {
        // Owner: end session for all
        // Save latest state first (so others' work isn't lost)
        await handleSave();
        await endSessionAPI(boardId);
        // Broadcast to sockets → collaborators redirect
        socket?.emit('session:end', { boardId });
        pushToast('✓ Session ended for all', 'success');
        setShowEndConfirm(false);
        // Owner stays on board (can continue solo)
      } else {
        // Collaborator: leave board
        await leaveBoardAPI(boardId);
        pushToast('✓ You left the board', 'success');
        setShowEndConfirm(false);
        setTimeout(() => navigate('/dashboard'), 800);
      }
    } catch (err) {
      pushToast(
        err.response?.data?.message || 'Failed to end collaboration',
        'warning'
      );
    } finally {
      setEndingSession(false);
    }
  };

  const endCollabLabel = isOwner ? 'End Session' : 'Leave Board';
  const endCollabIcon = isOwner ? '🛑' : '🚪';

  return (
    <div className="flex flex-col h-[calc(100vh-73px)]">
      {/* Top bar */}
      <div className="bg-canvas-surface border-b border-canvas-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition"
            title="Back"
          >
            ←
          </button>

          {editingName ? (
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              autoFocus
              className="bg-canvas-bg border border-primary rounded px-2 py-1 text-sm focus:outline-none min-w-0"
            />
          ) : (
            <h1
              onClick={() => isOwner && setEditingName(true)}
              className={`font-semibold text-lg truncate ${
                isOwner ? 'cursor-pointer hover:text-primary transition' : ''
              }`}
              title={isOwner ? 'Click to rename' : boardName}
            >
              {boardName}
            </h1>
          )}

          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              saveStatus === 'saved'
                ? 'bg-green-500/10 text-green-400'
                : saveStatus === 'saving'
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-orange-500/10 text-orange-400'
            }`}
            title={isOwner ? 'You are the owner' : 'Owner controls persistence'}
          >
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'saving' && '⏳ Saving...'}
            {saveStatus === 'unsaved' && (isOwner ? '● Unsaved' : '● Live')}
          </span>

          {!isOwner && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
              👥 Collaborator
            </span>
          )}

          <span className="text-xs text-slate-500 hidden md:inline">
            📐 {canvas.dimensions.width} × {canvas.dimensions.height}
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          <PresenceBar onlineUsers={onlineUsers} isConnected={collab.isConnected} />

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`relative px-3 py-1.5 text-sm rounded-lg border transition ${
              isChatOpen
                ? 'bg-primary/20 border-primary text-white'
                : 'bg-canvas-bg border-canvas-border hover:border-slate-500'
            }`}
            title="Toggle chat"
          >
            💬 Chat
            {chat.unreadCount > 0 && !isChatOpen && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 animate-pulse">
                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleShareLink}
            className="px-3 py-1.5 text-sm bg-canvas-bg border border-canvas-border rounded-lg hover:border-slate-500 transition"
            title={isOwner ? 'Enable link sharing and copy the link' : 'Copy board link'}
          >
            🔗 Share
          </button>

          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1.5 text-sm bg-canvas-bg border border-canvas-border rounded-lg hover:border-slate-500 transition"
          >
            📥 Export ▾
          </button>
          {showExportMenu && (
            <div className="absolute top-full right-0 mt-1 bg-canvas-surface border border-canvas-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
              <button
                onClick={handleExportPNG}
                className="w-full px-4 py-2 text-sm text-left hover:bg-canvas-bg transition flex items-center gap-2"
              >
                🖼️ Export as PNG
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-2 text-sm text-left hover:bg-canvas-bg transition flex items-center gap-2 border-t border-canvas-border"
              >
                📄 Export as PDF
              </button>
            </div>
          )}

          {isOwner && (
            <button
              onClick={handleSave}
              disabled={saving || saveStatus === 'saved'}
              className="px-4 py-1.5 text-sm bg-primary hover:bg-primary-dark disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}

          {/* End Collab button */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-3 py-1.5 text-sm bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition font-medium"
            title={isOwner ? 'End session for all collaborators' : 'Leave this board'}
          >
            {endCollabIcon} {endCollabLabel}
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbar
          tool={canvas.tool}
          setTool={canvas.setTool}
          color={canvas.color}
          setColor={canvas.setColor}
          size={canvas.size}
          setSize={canvas.setSize}
          fontSize={canvas.fontSize}
          setFontSize={canvas.setFontSize}
          fontFamily={canvas.fontFamily}
          setFontFamily={canvas.setFontFamily}
          bgColor={canvas.bgColor}
          setBgColor={canvas.setBgColor}
          filled={canvas.filled}
          setFilled={canvas.setFilled}
          selectedIndex={canvas.selectedIndex}
          hasClipboard={canvas.hasClipboard}
          copySelected={canvas.copySelected}
          paste={canvas.paste}
          deleteSelected={canvas.deleteSelected}
          undo={canvas.undo}
          redo={canvas.redo}
          clearAll={handleClearAll}
          canClear={isOwner}
          canUndo={canvas.canUndo}
          canRedo={canvas.canRedo}
        />

        <div className="flex-1 overflow-auto bg-slate-900 relative">
          <div
            style={{
              position: 'relative',
              width: `${canvas.dimensions.width}px`,
              height: `${canvas.dimensions.height}px`,
            }}
          >
            <CanvasBoard
              canvasRef={canvas.canvasRef}
              handleMouseDown={canvas.handleMouseDown}
              handleMouseMove={canvas.handleMouseMove}
              handleMouseUp={canvas.handleMouseUp}
              tool={canvas.tool}
              isDragging={canvas.isDragging}
              textInput={canvas.textInput}
              submitText={canvas.submitText}
              cancelText={canvas.cancelText}
              color={canvas.color}
              fontSize={canvas.fontSize}
              fontFamily={canvas.fontFamily}
              bgColor={canvas.bgColor}
              dimensions={canvas.dimensions}
            />
            <CursorOverlay cursors={remoteCursors} />
          </div>
        </div>

        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chat.messages}
          loadingHistory={chat.loadingHistory}
          typingUsers={chat.typingUsers}
          sendMessage={chat.sendMessage}
          notifyTyping={chat.notifyTyping}
        />
      </div>

      {/* Toast notifications */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
              t.type === 'success'
                ? 'bg-green-500/90 text-white'
                : t.type === 'warning'
                ? 'bg-orange-500/90 text-white'
                : 'bg-canvas-surface border border-canvas-border text-white'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* End Collab confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-canvas-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-4xl mb-3">{endCollabIcon}</div>
            <h2 className="text-xl font-bold mb-2">{endCollabLabel}?</h2>
            <div className="text-sm text-slate-400 mb-6 leading-relaxed space-y-2">
              {isOwner ? (
                <>
                  <p>
                    All <strong className="text-white">{Math.max(0, onlineUsers.length - 1)}</strong>{' '}
                    {onlineUsers.length - 1 === 1 ? 'collaborator' : 'collaborators'} will be
                    removed from this board.
                  </p>
                  <p className="flex items-start gap-2 text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <span className="text-lg leading-none">⚠️</span>
                    <span>
                      <strong>Chat history will be permanently deleted.</strong> Latest canvas
                      changes will be saved. You can continue editing alone or share again later.
                    </span>
                  </p>
                </>
              ) : (
                <p>
                  You will lose access to this board. The owner will need to share the link
                  again to let you back in.
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEndConfirm(false)}
                disabled={endingSession}
                className="px-4 py-2 text-sm bg-canvas-bg border border-canvas-border rounded-lg hover:border-slate-500 disabled:opacity-40 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEndCollab}
                disabled={endingSession}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center gap-2"
              >
                {endingSession && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                )}
                {endingSession
                  ? isOwner
                    ? 'Ending...'
                    : 'Leaving...'
                  : isOwner
                  ? 'End Session'
                  : 'Leave Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;