// =============================================================================
// Atomic Sliding-Window Rate Limiter (Redis Lua Script + Local Fallback)
// =============================================================================
// WHY THIS FILE EXISTS:
//   Protects login, OTP, board creation, and live WebSocket events from spam/abuse.
//   Uses a Redis Sorted Set (ZSET) inside a single Lua script so checking + adding
//   the request happens atomically (no race conditions under concurrent requests).
//   If Redis is not running locally, it automatically falls back to an in-memory Map.
// =============================================================================

const crypto = require('crypto');
const { redisClient, getRedisStatus } = require('../config/redis');

// Lua script executed atomically inside Redis:
// 1. Delete timestamps older than (now - window)
// 2. Count how many requests remain in the current sliding window
// 3. If count >= maxRequests -> reject {0, 0}
// 4. Otherwise record this request and refresh the key's TTL -> allow {1, remaining}
const SLIDING_WINDOW_SCRIPT = `
local key         = KEYS[1]
local now         = tonumber(ARGV[1])
local window      = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local member      = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count >= maxRequests then
  return {0, 0}
end

redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, window)
return {1, maxRequests - (count + 1)}
`;

class SlidingWindowLimiter {
  constructor() {
    // Used only in local dev when Redis is offline
    this.memoryWindows = new Map();
  }

  /**
   * WHAT IT DOES: Local in-memory sliding-window fallback when Redis isn't running.
   * Keeps an array of recent timestamps per key and filters out expired ones.
   */
  allowInMemory(key, maxRequests, windowSize) {
    const now = Date.now();
    const cutoff = now - windowSize * 1000;
    const timestamps = (this.memoryWindows.get(key) || []).filter((ts) => ts > cutoff);

    if (timestamps.length >= maxRequests) {
      this.memoryWindows.set(key, timestamps);
      return { allowed: false, remaining: 0 };
    }

    timestamps.push(now);
    this.memoryWindows.set(key, timestamps);
    return { allowed: true, remaining: maxRequests - timestamps.length };
  }

  /**
   * WHAT IT DOES: Checks whether a user/IP is allowed to make another request.
   * RETURNS: `{ allowed: true/false, remaining: number }`.
   */
  async allow(key, maxRequests, windowSize) {
    if (!getRedisStatus()) {
      return this.allowInMemory(key, maxRequests, windowSize);
    }

    const now = Math.floor(Date.now() / 1000);
    // Append a UUID so two requests in the exact same second stay distinct in the ZSET
    const member = `${now}:${crypto.randomUUID()}`;

    const [allowed, remaining] = await redisClient.eval(SLIDING_WINDOW_SCRIPT, {
      keys: [key],
      arguments: [String(now), String(windowSize), String(maxRequests), member],
    });

    return {
      allowed: allowed === 1,
      remaining,
    };
  }
}

module.exports = new SlidingWindowLimiter();
