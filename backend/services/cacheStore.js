// Key-Value TTL store adapter that uses Redis when connected and transparently
// degrades to an in-memory TTL Map in local development when Redis is offline.
// Implements the Strategy / Graceful Degradation pattern.

const { redisClient, getRedisStatus } = require('../config/redis');

const memoryStore = new Map();

/**
 * Reads a non-expired value from the in-memory fallback Map.
 * @param {string} key - Cache key.
 * @returns {string|null} Stored string value or null if missing/expired.
 */
const memGet = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

/**
 * Retrieves a string value by key from Redis (or in-memory fallback).
 * @param {string} key - Cache key.
 * @returns {Promise<string|null>}
 */
const get = async (key) => {
  if (getRedisStatus()) return redisClient.get(key);
  return memGet(key);
};

/**
 * Stores a string value with an optional TTL in seconds.
 * @param {string} key - Cache key.
 * @param {string} value - String value to store.
 * @param {{ EX?: number }} [options] - Optional expiration in seconds.
 * @returns {Promise<void>}
 */
const set = async (key, value, options = {}) => {
  if (getRedisStatus()) {
    await redisClient.set(key, String(value), options);
    return;
  }
  const expiresAt = options.EX ? Date.now() + options.EX * 1000 : null;
  memoryStore.set(key, { value: String(value), expiresAt });
};

/**
 * Atomically increments an integer counter stored at key and returns the new value.
 * @param {string} key - Counter key.
 * @returns {Promise<number>} Incremented numeric value.
 */
const incr = async (key) => {
  if (getRedisStatus()) return redisClient.incr(key);
  const current = Number(memGet(key) || 0);
  const next = current + 1;
  const existing = memoryStore.get(key);
  memoryStore.set(key, {
    value: String(next),
    expiresAt: existing?.expiresAt ?? null,
  });
  return next;
};

/**
 * Sets a TTL (in seconds) on an existing key.
 * @param {string} key - Cache key.
 * @param {number} ttlSeconds - Time to live in seconds.
 * @returns {Promise<void>}
 */
const expire = async (key, ttlSeconds) => {
  if (getRedisStatus()) {
    await redisClient.expire(key, ttlSeconds);
    return;
  }
  const existing = memoryStore.get(key);
  if (existing) {
    existing.expiresAt = Date.now() + ttlSeconds * 1000;
  }
};

/**
 * Deletes a key from Redis (or the in-memory fallback).
 * @param {string} key - Cache key.
 * @returns {Promise<void>}
 */
const del = async (key) => {
  if (getRedisStatus()) {
    await redisClient.del(key);
    return;
  }
  memoryStore.delete(key);
};

module.exports = { get, set, incr, expire, del };
