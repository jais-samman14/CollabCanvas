import { memo } from 'react';
import './PresenceBar.css';

const MAX_VISIBLE = 5;

/**
 * Memoized presence indicator showing live WebSocket connection status and
 * stacked circular avatars for collaborators currently active on the board.
 * @param {{ onlineUsers: Array<{ userId: string, name: string, color: string }>, isConnected: boolean }} props
 */
const PresenceBar = memo(({ onlineUsers, isConnected }) => {
  const visible = onlineUsers.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, onlineUsers.length - MAX_VISIBLE);

  return (
    <div className="presence-bar">
      <div
        className="presence-bar__status"
        title={isConnected ? 'Connected' : 'Disconnected'}
      >
        <span
          className={`presence-bar__dot ${
            isConnected ? 'presence-bar__dot--live' : 'presence-bar__dot--offline'
          }`}
        />
        <span className="presence-bar__label">{isConnected ? 'Live' : 'Offline'}</span>
      </div>

      {onlineUsers.length > 0 && (
        <div className="presence-bar__avatars">
          {visible.map((member) => (
            <div
              key={member.userId}
              title={member.name}
              className="presence-bar__avatar"
              style={{ backgroundColor: member.color }}
            >
              {member.name?.[0]?.toUpperCase() || '?'}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="presence-bar__avatar presence-bar__avatar--overflow"
              title={`+${overflow} more`}
            >
              +{overflow}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PresenceBar.displayName = 'PresenceBar';

export default PresenceBar;
