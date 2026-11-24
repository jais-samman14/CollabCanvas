// Per-event WebSocket sliding-window rate limit thresholds.
module.exports = {
  CHAT_SEND: {
    maxRequests: 30,
    windowSize: 60,
  },

  // Client batches scene deltas every 100ms (~10 events/sec max during active drawing).
  // 1200/min gives 2x headroom for multi-tab bursts and paste operations.
  SCENE_UPDATE: {
    maxRequests: 1200,
    windowSize: 60,
  },

  BOARD_CLEAR: {
    maxRequests: 10,
    windowSize: 300,
  },

  SESSION_END: {
    maxRequests: 5,
    windowSize: 3600,
  },

  TYPING: {
    maxRequests: 60,
    windowSize: 60,
  },

  MAX_VIOLATIONS: 3,
};
