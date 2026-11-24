const limiter = require('../rateLimiter/SlidingWindowLimiter');

/**
 * Factory that builds an Express middleware enforcing a sliding-window rate limit
 * keyed by authenticated user ID (or client IP for unauthenticated routes).
 * Fails open on unexpected store errors so traffic is never blocked by cache outages.
 * @param {{ maxRequests: number, windowSize: number, keyPrefix: string }} config
 * @returns {import('express').RequestHandler}
 */
const createRateLimiter = ({ maxRequests, windowSize, keyPrefix }) => {
  return async (req, res, next) => {
    try {
      const identifier = req.user?._id || req.ip;
      const key = `${keyPrefix}:${identifier}`;
      const result = await limiter.allow(key, maxRequests, windowSize);

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again shortly.',
        });
      }

      res.set('X-RateLimit-Remaining', String(result.remaining));
      next();
    } catch (err) {
      console.error('Rate limiter middleware error:', err.message);
      next();
    }
  };
};

module.exports = createRateLimiter;
