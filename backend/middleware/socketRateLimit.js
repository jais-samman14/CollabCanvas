// middleware/socketRateLimit.js
const limiter = require("../rateLimiter/SlidingWindowLimiter");
const { MAX_VIOLATIONS } = require("../rateLimiter/socketLimiter");

/**
 * Check rate limit for a socket event.
 * @param {Socket} socket - Socket.io socket
 * @param {string} eventName - Event name (for key prefix)
 * @param {Object} config - { maxRequests, windowSize }
 * @returns {boolean} - true if allowed, false if blocked
 */

const checkSocketRateLimit = async (socket, eventName, config) => {
  try {
    const userId = socket.data.user?._id;
    if (!userId) return false;

    const key = `socket:${eventName}:${userId}`;

    const result = await limiter.allow(
      key,
      config.maxRequests,
      config.windowSize
    );

    if (!result.allowed) {
      // Track violation on socket
      socket.data.violations = (socket.data.violations || 0) + 1;

      // Notify client
      socket.emit("rate_limit_exceeded", {
        event: eventName,
        message: `Too many ${eventName} events. Please slow down.`,
        violations: socket.data.violations,
        maxViolations: MAX_VIOLATIONS,
      });

      console.warn(
        ` Rate limit hit: ${socket.data.user.name} on ${eventName} (violation ${socket.data.violations}/${MAX_VIOLATIONS})`
      );

      // Auto-disconnect after MAX_VIOLATIONS
      if (socket.data.violations >= MAX_VIOLATIONS) {
        console.error(
          ` Disconnecting ${socket.data.user.name} for repeated abuse`
        );
        socket.emit("disconnected_for_abuse", {
          message: "Disconnected due to repeated rate limit violations.",
        });
        socket.disconnect(true);
      }

      return false;
    }

    return true;
  } catch (err) {
    console.error("Socket rate limit error:", err.message);
    // Fail open: agar Redis down hai toh block mat karo
    return true;
  }
};

module.exports = checkSocketRateLimit;