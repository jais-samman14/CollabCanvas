import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exportToBlob } from '@excalidraw/excalidraw';
import jsPDF from 'jspdf';
import { useCollab } from '../../hooks/useCollab';
import { usePresence } from '../../hooks/usePresence';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ExcalidrawBoard from '../../components/ExcalidrawBoard/ExcalidrawBoard';
import PresenceBar from '../../components/PresenceBar/PresenceBar';
import ChatPanel from '../../components/ChatPanel/ChatPanel';
import {
  getBoardByIdAPI,
  updateBoardAPI,
  leaveBoardAPI,
  endSessionAPI,
  setBoardSharing,
} from '../../services/boardService';
import { throttle } from '../../utils/throttle';
import './BoardPage.css';

/**
 * Route container that loads a board by URL `:id` and renders the live editor.
 */
const BoardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadBoard = async () => {
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

    loadBoard();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="board-state-screen">
        <div className="board-state-box">
          <div className="spinner spinner-lg board-state-spinner" />
          <p className="board-state-muted">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="board-state-screen">
        <div className="board-state-box">
          <div className="board-state-emoji">😢</div>
          <h2 className="board-state-title">{error}</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="board-state-btn"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <BoardEditor board={board} boardId={id} />;
};

/**
 * Interactive whiteboard workspace coordinating ExcalidrawBoard, real-time sync,
 * collaborator presence, chat sidebar, PNG/PDF export, sharing, and session controls.
 * @param {{ board: object, boardId: string }} props
 */
const BoardEditor = ({ board, boardId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [boardName, setBoardName] = useState(board.name);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  const ownerId = board.owner?._id?.toString() || board.owner?.toString();
  const isOwner = user?._id?.toString() === ownerId;

  const { onlineUsers } = usePresence(boardId);
  const boardRef = useRef(null);
  const exportMenuRef = useRef(null);
  const prevUsersRef = useRef([]);

  /** Displays a transient notification toast in the top-right corner. */
  const pushToast = useCallback((msg, type = 'info') => {
    const tid = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id: tid, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== tid));
    }, 3000);
  }, []);

  /** Marks the board state as having unsaved local changes. */
  const markDirty = useCallback(() => {
    setSaveStatus('unsaved');
  }, []);

  const collabHandlers = useMemo(
    () => ({
      onSceneUpdated: ({ elements }) => {
        boardRef.current?.applyRemoteElements?.(elements);
      },
      onSceneSynced: ({ elements }) => {
        boardRef.current?.applyRemoteElements?.(elements);
      },
      onBoardCleared: ({ by }) => {
        boardRef.current?.applyRemoteClear?.();
        pushToast(`${by?.name || 'Someone'} cleared the board`, 'warning');
      },
      onCursorMoved: (cursorData) => {
        boardRef.current?.updateRemoteCursor?.(cursorData);
      },
    }),
    [pushToast]
  );

  const collab = useCollab(boardId, collabHandlers);

  const throttledCursorEmit = useMemo(
    () => throttle(collab.emitCursorMove, 50),
    [collab.emitCursorMove]
  );

  useEffect(() => {
    return () => throttledCursorEmit.cancel();
  }, [throttledCursorEmit]);

  const chat = useChat(boardId, isChatOpen);

  // Close the export dropdown when clicking anywhere outside it
  useEffect(() => {
    if (!showExportMenu) return;
    const handleOutsideClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showExportMenu]);

  // Redirect collaborators when the board owner ends the session
  useEffect(() => {
    if (!socket) return;
    let redirectTimer = null;
    const handleSessionEnded = ({ by }) => {
      if (isOwner) return;
      pushToast(`⚠️ ${by?.name || 'Owner'} ended the session`, 'warning');
      redirectTimer = setTimeout(() => navigate('/dashboard'), 2000);
    };
    socket.on('session:ended', handleSessionEnded);
    return () => {
      clearTimeout(redirectTimer);
      socket.off('session:ended', handleSessionEnded);
    };
  }, [socket, isOwner, navigate, pushToast]);

  // Surface server-side rejections (e.g. authorization errors)
  useEffect(() => {
    if (!socket) return;
    const handleServerError = ({ message }) => {
      pushToast(`⚠️ ${message}`, 'warning');
    };
    socket.on('error', handleServerError);
    return () => socket.off('error', handleServerError);
  }, [socket, pushToast]);

  // Emit join/leave toasts and clean up departed collaborator cursors using a ref (no extra render)
  useEffect(() => {
    const prevUsers = prevUsersRef.current;
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
        boardRef.current?.removeRemoteCursor?.(u.userId);
      }
    });

    prevUsersRef.current = onlineUsers;
  }, [onlineUsers, user?._id, pushToast]);

  // Mark dirty when board name is edited
  const isFirstNameRender = useRef(true);
  useEffect(() => {
    if (isFirstNameRender.current) {
      isFirstNameRender.current = false;
      return;
    }
    setSaveStatus('unsaved');
  }, [boardName]);

  /** Persists the current board metadata and Excalidraw scene snapshot to the backend. */
  const handleSave = useCallback(async () => {
    const snapshot = boardRef.current?.getPersistableState?.();
    if (!snapshot) return;
    try {
      setSaving(true);
      setSaveStatus('saving');
      await updateBoardAPI(boardId, {
        name: boardName,
        elements: snapshot.elements,
        appState: snapshot.appState,
        backgroundColor: snapshot.backgroundColor,
      });
      setSaveStatus('saved');
    } catch {
      pushToast('❌ Failed to save', 'warning');
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  }, [boardId, boardName, pushToast]);

  // Auto-save for the owner after 3 seconds of inactivity
  useEffect(() => {
    if (!isOwner || saveStatus !== 'unsaved') return;
    const timer = setTimeout(() => handleSave(), 3000);
    return () => clearTimeout(timer);
  }, [saveStatus, handleSave, isOwner]);

  // Warn the owner before closing a tab with unsaved changes
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

  // Cmd/Ctrl+S shortcut to save (Excalidraw natively handles Undo/Redo/Copy/Paste/Delete)
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isOwner) handleSave();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleSave, isOwner]);

  /** Renders the current Excalidraw scene into a PNG Blob for PNG/PDF exports. */
  const generateBoardPngBlob = async () => {
    const api = boardRef.current?.getAPI?.();
    if (!api) return null;
    const elements = api.getSceneElements();
    if (!elements.length) {
      pushToast('Board is empty — draw something before exporting', 'warning');
      return null;
    }
    return exportToBlob({
      elements,
      appState: {
        ...api.getAppState(),
        exportBackground: true,
        exportWithDarkMode: false,
      },
      files: api.getFiles(),
      mimeType: 'image/png',
    });
  };

  /** Exports the board canvas as a downloadable PNG file. */
  const handleExportPNG = async () => {
    try {
      const blob = await generateBoardPngBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${boardName || 'board'}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      pushToast('❌ Failed to export PNG', 'warning');
    } finally {
      setShowExportMenu(false);
    }
  };

  /** Exports the board canvas as a landscape/portrait PDF document. */
  const handleExportPDF = async () => {
    try {
      const blob = await generateBoardPngBlob();
      if (!blob) return;

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });

      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
        compress: true,
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save(`${boardName || 'board'}.pdf`);
    } catch {
      pushToast('❌ Failed to export PDF', 'warning');
    } finally {
      setShowExportMenu(false);
    }
  };

  /** Clears the entire board for every connected user (owner only). */
  const handleClearAll = useCallback(() => {
    if (!isOwner) {
      pushToast('⚠️ Only the board owner can clear the board', 'warning');
      return;
    }
    if (!window.confirm('Clear entire canvas for everyone?')) return;
    boardRef.current?.clearLocalAndBroadcast?.();
    collab.emitBoardClear();
  }, [isOwner, collab, pushToast]);

  /** Enables link sharing (if owner) and copies the board URL to the clipboard. */
  const handleShareLink = async () => {
    try {
      if (isOwner) {
        await setBoardSharing(boardId, true);
      }
      await navigator.clipboard.writeText(window.location.href);
      pushToast('🔗 Share link copied — anyone with the link can now join', 'success');
    } catch {
      pushToast('Failed to copy share link', 'warning');
    }
  };

  /** Ends the session for all collaborators (owner) or leaves the board (collaborator). */
  const handleEndCollab = async () => {
    try {
      setEndingSession(true);
      if (isOwner) {
        await boardRef.current?.flushNow?.();
        await handleSave();
        await endSessionAPI(boardId);
        socket?.emit('session:end', { boardId });
        pushToast('✓ Session ended for all', 'success');
        setShowEndConfirm(false);
      } else {
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
    <div className="board-page">
      <header className="board-toolbar">
        <div className="board-toolbar__left">
          <button
            onClick={() => navigate('/dashboard')}
            className="board-toolbar__back-btn"
            title="Back to Dashboard"
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
              className="board-toolbar__name-input"
            />
          ) : (
            <h1
              onClick={() => isOwner && setEditingName(true)}
              className={`board-toolbar__title ${
                isOwner ? 'board-toolbar__title--editable' : ''
              }`}
              title={isOwner ? 'Click to rename' : boardName}
            >
              {boardName}
            </h1>
          )}

          <span
            className={`board-toolbar__status board-toolbar__status--${saveStatus}`}
            title={
              isOwner
                ? 'Auto-saves after 3s of inactivity'
                : 'Live changes are automatically synced to the server'
            }
          >
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'saving' && '⏳ Saving...'}
            {saveStatus === 'unsaved' && (isOwner ? '● Unsaved' : '● Live Sync')}
          </span>

          {!isOwner && <span className="board-toolbar__collab-badge">👥 Collaborator</span>}
        </div>

        <div className="board-toolbar__right">
          <PresenceBar onlineUsers={onlineUsers} isConnected={collab.isConnected} />

          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className={`board-btn board-btn--chat ${isChatOpen ? 'board-btn--active' : ''}`}
            title="Toggle chat"
          >
            💬 Chat
            {chat.unreadCount > 0 && !isChatOpen && (
              <span className="board-btn__badge">
                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleShareLink}
            className="board-btn"
            title={isOwner ? 'Enable link sharing and copy URL' : 'Copy board link'}
          >
            🔗 Share
          </button>

          <div className="board-export-wrapper" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="board-btn"
            >
              📥 Export ▾
            </button>
            {showExportMenu && (
              <div className="board-export-menu">
                <button onClick={handleExportPNG} className="board-export-menu__item">
                  🖼️ Export as PNG
                </button>
                <button
                  onClick={handleExportPDF}
                  className="board-export-menu__item board-export-menu__item--bordered"
                >
                  📄 Export as PDF
                </button>
              </div>
            )}
          </div>

          {isOwner && (
            <>
              <button
                onClick={handleClearAll}
                className="board-btn board-btn--warn"
                title="Clear board for all users"
              >
                🗑️ Clear
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saveStatus === 'saved'}
                className="board-btn board-btn--primary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}

          <button
            onClick={() => setShowEndConfirm(true)}
            className="board-btn board-btn--danger"
            title={isOwner ? 'End session for all collaborators' : 'Leave this board'}
          >
            {endCollabIcon} {endCollabLabel}
          </button>
        </div>
      </header>

      <main className="board-workspace">
        <ExcalidrawBoard
          ref={boardRef}
          initialElements={board.elements || []}
          initialAppState={board.appState || {}}
          initialBgColor={board.backgroundColor || '#ffffff'}
          onEmitSceneUpdate={collab.emitSceneUpdate}
          onEmitCursorMove={throttledCursorEmit}
          onSceneDirty={markDirty}
          isOwner={isOwner}
          onClearBoard={handleClearAll}
        />

        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chat.messages}
          loadingHistory={chat.loadingHistory}
          typingUsers={chat.typingUsers}
          sendMessage={chat.sendMessage}
          notifyTyping={chat.notifyTyping}
        />
      </main>

      <div className="board-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`board-toast board-toast--${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {showEndConfirm && (
        <div className="board-modal-backdrop">
          <div className="board-modal">
            <div className="board-modal__icon">{endCollabIcon}</div>
            <h2 className="board-modal__title">{endCollabLabel}?</h2>
            <div className="board-modal__body">
              {isOwner ? (
                <>
                  <p>
                    All{' '}
                    <strong className="board-modal__strong">
                      {Math.max(0, onlineUsers.length - 1)}
                    </strong>{' '}
                    {onlineUsers.length - 1 === 1 ? 'collaborator' : 'collaborators'} will be
                    removed from this board.
                  </p>
                  <p className="board-modal__warning-box">
                    <span>⚠️</span>
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
            <div className="board-modal__actions">
              <button
                onClick={() => setShowEndConfirm(false)}
                disabled={endingSession}
                className="board-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleEndCollab}
                disabled={endingSession}
                className="board-modal__confirm-btn"
              >
                {endingSession && <span className="spinner spinner-sm" />}
                {endingSession
                  ? isOwner
                    ? 'Ending...'
                    : 'Leaving...'
                  : endCollabLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardPage;
