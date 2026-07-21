
/**
 * Renders live cursors of other users overlaid on the canvas.
 * @param {Object} props
 * @param {Object} props.cursors - { userId: { name, color, x, y } }
 */
const CursorOverlay = ({ cursors }) => {
  return (
    <>
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          style={{
            position: 'absolute',
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            pointerEvents: 'none',
            zIndex: 50,
            transform: 'translate(-2px, -2px)',
            transition: 'left 0.1s linear, top 0.1s linear',
          }}
        >
          {/* Cursor arrow SVG */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: 'block' }}
          >
            <path
              d="M4 4 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z"
              fill={cursor.color}
              stroke="#ffffff"
              strokeWidth="1"
            />
          </svg>

          {/* Name label */}
          <div
            style={{
              marginTop: '2px',
              padding: '2px 8px',
              backgroundColor: cursor.color,
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </>
  );
};

export default CursorOverlay;
