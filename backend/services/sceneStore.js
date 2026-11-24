// =============================================================================
// Server-Side Authoritative Scene Store (Write-Behind Cache)
// =============================================================================
// WHY THIS FILE EXISTS:
//   If we saved to MongoDB on every single mouse move, the database would crash
//   under load. Instead, this file keeps the live whiteboard in RAM (super fast),
//   merges edits from all collaborators using CRDT version rules, and saves to
//   MongoDB in the background every 2 seconds (or at most 10 seconds under heavy drawing).
// =============================================================================

const { isNewer } = require('../utils/sceneMerge');
const { LIMITS } = require('../utils/sceneValidation');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * WHAT IT DOES: Creates a scene cache manager linked to our MongoDB Board model.
 * Accepting options/BoardModel as arguments also makes it super easy to unit test.
 */
const createSceneStore = ({
  BoardModel,
  flushDebounceMs = 2000,      // Wait 2s after the last edit before writing to MongoDB
  flushMaxWaitMs = 10000,      // Even if people never stop drawing, still save every 10s
  retryDelayMs = 5000,         // If MongoDB fails temporarily, retry after 5s
  idleEvictMs = 10 * 60 * 1000,// Free RAM for boards untouched for 10 minutes
  tombstoneTtlMs = 7 * DAY_MS, // Permanently clean up deleted shapes after 7 days
  now = Date.now,
  logger = console,
} = {}) => {
  // Map of boardId -> { elements: Map, dirty, firstDirtyAt, timer, flushing, lastTouched, ready }
  const scenes = new Map();
  let evictTimer = null;

  /**
   * WHAT IT DOES: Starts a 1-minute interval that frees memory for idle boards.
   */
  const startEvictTimer = () => {
    if (evictTimer) return;
    evictTimer = setInterval(evictIdle, 60 * 1000);
    evictTimer.unref?.(); // Don't block Node.js from exiting during shutdown
  };

  /**
   * WHAT IT DOES: Cancels any pending save timer for a board before rescheduling.
   */
  const clearFlushTimer = (entry) => {
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
  };

  /**
   * WHAT IT DOES: Schedules a background MongoDB save using dual-bound debouncing.
   * HOW IT WORKS: Normally waits 2s after the last edit, but caps the total wait
   * at 10s (`flushMaxWaitMs`) so continuous drawing still gets saved regularly.
   */
  const scheduleFlush = (boardId, entry, delayOverride) => {
    clearFlushTimer(entry);
    const t = now();
    if (!entry.firstDirtyAt) entry.firstDirtyAt = t;
    const maxWaitLeft = Math.max(0, entry.firstDirtyAt + flushMaxWaitMs - t);
    const delay = delayOverride ?? Math.min(flushDebounceMs, maxWaitLeft);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      flush(boardId).catch((err) => logger.error('sceneStore flush error:', err.message));
    }, delay);
    entry.timer.unref?.();
  };

  /**
   * WHAT IT DOES: Removes very old soft-deleted shapes (tombstones older than 7 days)
   * so MongoDB documents don't grow forever.
   */
  const prune = (entry) => {
    const cutoff = now() - tombstoneTtlMs;
    for (const [id, el] of entry.elements) {
      if (el.isDeleted && typeof el.updated === 'number' && el.updated < cutoff) {
        entry.elements.delete(id);
      }
    }
  };

  /**
   * WHAT IT DOES: Writes the board's current elements array to MongoDB.
   * If the DB write fails, marks the board dirty again and schedules an automatic retry.
   */
  const writeSnapshot = async (boardId, entry) => {
    entry.dirty = false;
    entry.firstDirtyAt = null;
    prune(entry);
    const elements = Array.from(entry.elements.values());
    try {
      const res = await BoardModel.updateOne({ _id: boardId }, { $set: { elements } });
      if (res && res.matchedCount === 0) {
        scenes.delete(boardId); // Board was deleted in DB, drop it from RAM
      }
    } catch (err) {
      entry.dirty = true;
      logger.error(`sceneStore: failed to save board ${boardId}:`, err.message);
      scheduleFlush(boardId, entry, retryDelayMs);
    }
  };

  /**
   * WHAT IT DOES: Immediately saves a board's unsaved changes to MongoDB.
   */
  const flush = async (boardId) => {
    const entry = scenes.get(boardId);
    if (!entry) return;
    clearFlushTimer(entry);
    if (entry.flushing) await entry.flushing;
    if (!entry.dirty) return;
    entry.flushing = writeSnapshot(boardId, entry).finally(() => {
      entry.flushing = null;
    });
    await entry.flushing;
  };

  /**
   * WHAT IT DOES: Loads a board from MongoDB into RAM once.
   * If two users join at the exact same millisecond, they share the same `entry.ready`
   * promise instead of querying MongoDB twice.
   */
  const load = async (boardId) => {
    boardId = String(boardId);
    let entry = scenes.get(boardId);
    if (!entry) {
      entry = {
        elements: new Map(),
        dirty: false,
        firstDirtyAt: null,
        timer: null,
        flushing: null,
        lastTouched: now(),
        ready: null,
      };
      entry.ready = (async () => {
        const doc = await BoardModel.findById(boardId).select('elements').lean();
        if (!doc) throw new Error('Board not found');
        for (const el of doc.elements || []) {
          if (el && typeof el.id === 'string' && isNewer(el, entry.elements.get(el.id))) {
            entry.elements.set(el.id, el);
          }
        }
      })();
      scenes.set(boardId, entry);
      startEvictTimer();
    }
    try {
      await entry.ready;
    } catch (err) {
      if (scenes.get(boardId) === entry) scenes.delete(boardId);
      throw err;
    }
    entry.lastTouched = now();
    return entry;
  };

  /**
   * WHAT IT DOES: Drops clean boards from RAM if nobody touched them for 10+ minutes.
   */
  const evictIdle = () => {
    const cutoff = now() - idleEvictMs;
    for (const [boardId, entry] of scenes) {
      if (!entry.dirty && !entry.flushing && !entry.timer && entry.lastTouched < cutoff) {
        scenes.delete(boardId);
      }
    }
  };

  return {
    /** Returns all shapes for a board (loading from MongoDB if not yet in RAM). */
    async getElements(boardId) {
      const entry = await load(boardId);
      return Array.from(entry.elements.values());
    },

    /** Returns live shapes ONLY if already in RAM (never hits MongoDB). */
    peekElements(boardId) {
      const entry = scenes.get(String(boardId));
      return entry ? Array.from(entry.elements.values()) : null;
    },

    /**
     * WHAT IT DOES: Merges incoming shapes from a user into the live board using CRDT rules.
     * RETURNS: `changed` (the shapes that actually won and should be broadcast to teammates).
     */
    async applyDelta(boardId, elements) {
      boardId = String(boardId);
      const entry = await load(boardId);
      const changed = [];
      let dropped = 0;

      for (const el of elements) {
        const current = entry.elements.get(el.id);
        // Protect server memory by capping total shapes per board
        if (!current && entry.elements.size >= LIMITS.MAX_SCENE_ELEMENTS) {
          dropped++;
          continue;
        }
        if (isNewer(el, current)) {
          entry.elements.set(el.id, el);
          changed.push(el);
        }
      }

      if (changed.length > 0) {
        entry.dirty = true;
        scheduleFlush(boardId, entry);
      }
      return { changed, dropped };
    },

    /** Wipes a board's shapes from RAM and immediately clears MongoDB too. */
    async clear(boardId) {
      boardId = String(boardId);
      const entry = await load(boardId);
      entry.elements.clear();
      entry.dirty = true;
      await flush(boardId);
    },

    /** Immediately persists one board's unsaved changes to MongoDB. */
    flush: (boardId) => flush(String(boardId)),

    /** Immediately persists ALL unsaved boards (called on server shutdown). */
    async flushAll() {
      await Promise.all(Array.from(scenes.keys()).map((id) => flush(id)));
    },

    /** Removes a board from RAM without saving (used when a board is deleted). */
    evict(boardId) {
      const entry = scenes.get(String(boardId));
      if (entry) clearFlushTimer(entry);
      scenes.delete(String(boardId));
    },

    /** Clears all background timers cleanly on shutdown or test teardown. */
    stop() {
      if (evictTimer) clearInterval(evictTimer);
      evictTimer = null;
      for (const entry of scenes.values()) clearFlushTimer(entry);
    },

    /** Returns how many boards are currently cached in RAM. */
    size: () => scenes.size,
  };
};

module.exports = { createSceneStore };
