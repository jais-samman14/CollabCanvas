// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMyBoardsAPI,
  createBoardAPI,
  deleteBoardAPI,
} from '../services/boardService';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await getMyBoardsAPI();
      setBoards(response.data);
    } catch (err) {
      setError('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    try {
      setCreating(true);
      const response = await createBoardAPI({ name: 'Untitled Board' });
      navigate(`/board/${response.data._id}`);
    } catch (err) {
      setError('Failed to create board');
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this board? This cannot be undone.')) return;

    try {
      setDeletingId(id);
      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 400));
      await deleteBoardAPI(id);
      setBoards(boards.filter((b) => b._id !== id));
    } catch (err) {
      setError('Failed to delete board');
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
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

  const filteredBoards = boards.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const firstName = user?.name?.split(' ')[0] || 'there';
  const timeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-aurora-animated relative overflow-hidden">
      <div className="aurora-blob aurora-blob-1"></div>
      <div className="aurora-blob aurora-blob-2"></div>
      <div className="aurora-blob aurora-blob-3"></div>
      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* ═══════════════════════════════════════════ */}
        {/* Welcome Banner — animated */}
        {/* ═══════════════════════════════════════════ */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <p className="text-slate-400 text-sm mb-1 animate-fade-in">
                {timeOfDay()}, {firstName} 👋
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2">
                <span className="gradient-text-animated">Your Boards</span>
              </h1>
              <p className="text-slate-400 text-sm flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-live-pulse"></span>
                  {boards.length} {boards.length === 1 ? 'board' : 'boards'}
                </span>
                <span className="text-slate-600">•</span>
                <span>Real-time collaboration ready</span>
              </p>
            </div>

            <button
              onClick={handleCreateBoard}
              disabled={creating}
              className="group px-6 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all animate-glow-pulse flex items-center gap-2 shadow-lg"
            >
              <span className="text-xl group-hover:rotate-90 transition-transform duration-300">
                +
              </span>
              {creating ? 'Creating...' : 'New Board'}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* Search Bar — with focus animation */}
        {/* ═══════════════════════════════════════════ */}
        {boards.length > 0 && (
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your boards..."
                className="w-full pl-10 pr-4 py-2.5 bg-canvas-surface border border-canvas-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-lg focus:shadow-primary/10 transition-all text-white placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* Error Alert */}
        {/* ═══════════════════════════════════════════ */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2 animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* Loading — Skeleton Loaders */}
        {/* ═══════════════════════════════════════════ */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="bg-canvas-surface border border-canvas-border rounded-xl p-5 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="skeleton aspect-video rounded-lg mb-4"></div>
                <div className="skeleton h-4 rounded w-3/4 mb-2"></div>
                <div className="skeleton h-3 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : boards.length === 0 ? (
          /* ═══════════════════════════════════════════ */
          /* Empty State — floating illustration        */
          /* ═══════════════════════════════════════════ */
          <div className="text-center py-24 bg-canvas-surface/50 backdrop-blur-sm border border-canvas-border rounded-2xl animate-scale-in">
            <div className="text-8xl mb-4 animate-float inline-block">🎨</div>
            <h3 className="text-2xl font-bold mb-2">Ready to create magic?</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Your collaborative canvas awaits. Create your first board and start
              brainstorming with your team in real-time.
            </p>
            <button
              onClick={handleCreateBoard}
              disabled={creating}
              className="px-8 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 text-white font-semibold rounded-xl transition-all animate-glow-pulse shadow-2xl"
            >
              🚀 Create Your First Board
            </button>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-2xl mx-auto">
              {[
                { icon: '⚡', label: 'Real-time sync' },
                { icon: '🎨', label: '11 drawing tools' },
                { icon: '💬', label: 'Team chat' },
              ].map((f, i) => (
                <div
                  key={i}
                  className="p-4 bg-canvas-surface/50 border border-canvas-border rounded-lg animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                >
                  <div className="text-3xl mb-2">{f.icon}</div>
                  <div className="text-xs text-slate-400">{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredBoards.length === 0 ? (
          /* No search results */
          <div className="text-center py-24 animate-fade-in">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No boards found</h3>
            <p className="text-slate-400 text-sm">
              Try a different search term or create a new board.
            </p>
          </div>
        ) : (
          /* ═══════════════════════════════════════════ */
          /* Boards Grid — staggered animation           */
          /* ═══════════════════════════════════════════ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredBoards.map((board, index) => (
              <div
                key={board._id}
                onClick={() => navigate(`/board/${board._id}`)}
                className={`group relative bg-canvas-surface border border-canvas-border rounded-xl p-5 card-hover cursor-pointer overflow-hidden transition-all ${
                  deletingId === board._id
                    ? 'opacity-0 scale-90'
                    : 'animate-fade-in-up'
                }`}
                style={{
                  animationDelay: `${Math.min(index * 0.05, 0.5)}s`,
                  transition: deletingId === board._id
                    ? 'opacity 0.4s, transform 0.4s'
                    : undefined,
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-purple-600/0 group-hover:from-primary/5 group-hover:to-purple-600/5 transition-all duration-500 pointer-events-none rounded-xl"></div>

                {/* Preview area */}
                <div className="relative aspect-video bg-gradient-to-br from-canvas-bg to-slate-800 rounded-lg mb-4 flex items-center justify-center border border-canvas-border overflow-hidden group-hover:border-primary/50 transition-colors">
                  <span className="text-5xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-300">
                    🎨
                  </span>
                  {/* Corner badge — # of strokes */}
                  {board.strokes && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-canvas-bg/80 backdrop-blur-sm border border-canvas-border rounded-full text-[10px] text-slate-400">
                      🎨 drawings
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="relative flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate mb-1 group-hover:text-primary transition-colors">
                      {board.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Updated {formatDate(board.updatedAt)}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteBoard(board._id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-all"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* Stats footer (visible when boards exist)   */}
        {/* ═══════════════════════════════════════════ */}
        {boards.length > 0 && (
          <div
            className="mt-12 pt-6 border-t border-canvas-border animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="flex flex-wrap gap-4 justify-center text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                All boards synced
              </span>
              <span>•</span>
              <span>Powered by real-time collaboration</span>
              <span>•</span>
              <span>Built with ❤️ using MERN + Socket.io</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;