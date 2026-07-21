
/**
 * Displays circular avatars of online users on the current board.
 * Shows first letter of each name, colored per-user, with tooltip.
 */
const PresenceBar = ({ onlineUsers, isConnected }) => {
  const MAX_VISIBLE = 5;
  const visible = onlineUsers.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, onlineUsers.length - MAX_VISIBLE);

  return (
    <div className="flex items-center gap-2">
      {/* Connection status dot */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 bg-canvas-bg rounded-full border border-canvas-border"
        title={isConnected ? 'Connected' : 'Disconnected'}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          }`}
        />
        <span className="text-xs text-slate-400">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* User avatars */}
      {onlineUsers.length > 0 && (
        <div className="flex -space-x-2">
          {visible.map((user) => (
            <div
              key={user.userId}
              title={user.name}
              className="w-8 h-8 rounded-full border-2 border-canvas-surface flex items-center justify-center text-xs font-bold text-white shadow-md"
              style={{ backgroundColor: user.color }}
            >
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="w-8 h-8 rounded-full border-2 border-canvas-surface flex items-center justify-center text-xs font-bold text-white bg-slate-600 shadow-md"
              title={`+${overflow} more`}
            >
              +{overflow}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PresenceBar;