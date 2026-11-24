const limiter = require('../rateLimiter/SlidingWindowLimiter');
const { MAX_VIOLATIONS } = require('../rateLimiter/socketLimiter');

const VIOLATION_RESET_MS = 60 * 1000;

/**
 * Evaluates the sliding-window rate limit for an incoming Socket.IO event.
 * Tracks decaying abuse violations per socket and disconnects abusive clients
 * after MAX_VIOLATIONS consecutive hits within VIOLATION_RESET_MS.
 * @param {import('socket.io').Socket} socket - Authenticated Socket.IO client.
 * @param {string} eventName - Event identifier used as the limiter key prefix.
 * @param {{ maxRequests: number, windowSize: number }} config - Threshold settings.
 * @returns {Promise<boolean>} True if the event is allowed; false if throttled.
 */
const checkSocketRateLimit = async (socket, eventName, config) => {
  try {
    const userId = socket.data.user?._id;
    if (!userId) return false;

    const key = `socket:${eventName}:${userId}`;
    const result = await limiter.allow(key, config.maxRequests, config.windowSize);

    if (!result.allowed) {
      const now = Date.now();
      if (
        socket.data.lastViolationAt &&
        now - socket.data.lastViolationAt > VIOLATION_RESET_MS
      ) {
        socket.data.violations = 0;
      }

      socket.data.lastViolationAt = now;
      socket.data.violations = (socket.data.violations || 0) + 1;

      socket.emit('rate_limit_exceeded', {
        event: eventName,
        message: `Too many ${eventName} events. Please slow down.`,
        violations: socket.data.violations,
        maxViolations: MAX_VIOLATIONS,
      });

      if (socket.data.violations >= MAX_VIOLATIONS) {
        socket.emit('disconnected_for_abuse', {
          message: 'Disconnected due to repeated rate limit violations.',
        });
        socket.disconnect(true);
      }

      return false;
    }

    return true;
  } catch (err) {
    console.error('Socket rate limit error:', err.message);
    return true;
  }
};

module.exports = checkSocketRateLimit;
