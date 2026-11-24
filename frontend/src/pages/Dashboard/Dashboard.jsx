import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getMyBoardsAPI,
  createBoardAPI,
  deleteBoardAPI,
} from '../../services/boardService';
import './Dashboard.css';

/**
 * Formats an ISO date string into a compact relative label (e.g. "5m ago", "2d ago").
 * @param {string} dateString
 * @returns {string}
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Returns a time-of-day greeting string based on the user's local clock.
 * @returns {string}
 */
const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Authenticated user dashboard listing owned and shared whiteboards with
 * search filtering, instant board creation, and board deletion.
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  /** Loads all boards accessible to the logged-in user. */
  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await getMyBoardsAPI();
      setBoards(response.data || []);
    } catch {
      setError('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  /** Creates a new untitled board and navigates straight into its editor. */
  const handleCreateBoard = async () => {
    try {
      setCreating(true);
      const response = await createBoardAPI({ name: 'Untitled Board' });
      navigate(`/board/${response.data._id}`);
    } catch {
      setError('Failed to create board');
      setCreating(false);
    }
  };

  /** Deletes a board after user confirmation with a brief fade-out transition. */
  const handleDeleteBoard = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this board? This cannot be undone.')) return;

    try {
      setDeletingId(id);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await deleteBoardAPI(id);
      setBoards((prev) => prev.filter((b) => b._id !== id));
    } catch {
      setError('Failed to delete board');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="dashboard aurora-bg">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />

      <div className="dashboard__container">
        <header className="dashboard__header">
          <div>
            <p className="dashboard__greeting">
              {getTimeOfDayGreeting()}, {firstName} 👋
            </p>
            <h1 className="dashboard__title">
              <span className="gradient-text">Your Boards</span>
            </h1>
            <p className="dashboard__meta">
              <span className="dashboard__meta-live">
                <span className="dashboard__live-dot" />
                {boards.length} {boards.length === 1 ? 'board' : 'boards'}
              </span>
              <span className="dashboard__meta-sep">•</span>
              <span>Real-time collaboration ready</span>
            </p>
          </div>

          <button
            onClick={handleCreateBoard}
            disabled={creating}
            className="dashboard__new-btn"
          >
            <span className="dashboard__new-plus">+</span>
            {creating ? 'Creating...' : 'New Board'}
          </button>
        </header>

        {boards.length > 0 && (
          <div className="dashboard__search-wrap">
            <div className="dashboard__search-box">
              <span className="dashboard__search-icon">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your boards..."
                className="dashboard__search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="dashboard__search-clear"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="dashboard__error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="dashboard__grid">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="dashboard__skeleton-card">
                <div className="dashboard__skeleton-preview" />
                <div className="dashboard__skeleton-line dashboard__skeleton-line--wide" />
                <div className="dashboard__skeleton-line dashboard__skeleton-line--narrow" />
              </div>
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="dashboard__empty">
            <div className="dashboard__empty-icon">🎨</div>
            <h3 className="dashboard__empty-title">Ready to create?</h3>
            <p className="dashboard__empty-sub">
              Your collaborative infinite canvas awaits. Create your first board and
              start sketching with your team in real time.
            </p>
            <button
              onClick={handleCreateBoard}
              disabled={creating}
              className="dashboard__empty-cta"
            >
              🚀 Create Your First Board
            </button>

            <div className="dashboard__highlights">
              <div className="dashboard__highlight-card">
                <div className="dashboard__highlight-icon">⚡</div>
                <div className="dashboard__highlight-label">CRDT real-time sync</div>
              </div>
              <div className="dashboard__highlight-card">
                <div className="dashboard__highlight-icon">🎨</div>
                <div className="dashboard__highlight-label">Infinite Excalidraw canvas</div>
              </div>
              <div className="dashboard__highlight-card">
                <div className="dashboard__highlight-icon">💬</div>
                <div className="dashboard__highlight-label">Built-in team chat</div>
              </div>
            </div>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="dashboard__no-results">
            <div className="dashboard__no-results-icon">🔍</div>
            <h3 className="dashboard__no-results-title">No boards found</h3>
            <p className="dashboard__no-results-sub">
              Try a different search term or create a new board.
            </p>
          </div>
        ) : (
          <div className="dashboard__grid">
            {filteredBoards.map((board) => (
              <div
                key={board._id}
                onClick={() => navigate(`/board/${board._id}`)}
                className={`board-card ${
                  deletingId === board._id ? 'board-card--deleting' : ''
                }`}
              >
                <div
                  className="board-card__preview"
                  style={{
                    backgroundColor:
                      board.backgroundColor && board.backgroundColor !== '#ffffff'
                        ? board.backgroundColor
                        : undefined,
                  }}
                >
                  <span className="board-card__preview-icon">🎨</span>
                  {board.isPublic && (
                    <span className="board-card__shared-pill">🔗 Shared</span>
                  )}
                </div>

                <div className="board-card__footer">
                  <div className="board-card__info">
                    <h3 className="board-card__name">{board.name}</h3>
                    <span className="board-card__updated">
                      Updated {formatDate(board.updatedAt)}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteBoard(board._id, e)}
                    className="board-card__delete-btn"
                    title="Delete board"
                  >
                    🗑️
                  </button>
                </div>

                <div className="board-card__accent" />
              </div>
            ))}
          </div>
        )}

        {boards.length > 0 && (
          <footer className="dashboard__footer">
            <span className="dashboard__footer-live">
              <span className="dashboard__live-dot" />
              All boards synced
            </span>
            <span>•</span>
            <span>Powered by Excalidraw + Socket.IO + Redis</span>
          </footer>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
