//redis backed sliding window limiter....Redis sorted set(ZSET)
//key -> user_id or ip_address
//score -> timestamps
//value -> timestamp : crypto library (random number)

const crypto = require('crypto');//builtin nodejs module
const { redisClient } = require('../config/redis');

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
    async allow(key, maxRequests, windowSize) {
        const now = Math.floor(Date.now() / 1000);
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
};

module.exports = new SlidingWindowLimiter();

