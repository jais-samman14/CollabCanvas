const test = require('node:test');
const assert = require('node:assert/strict');
const { createSceneStore } = require('../services/sceneStore');

const el = (id, version, versionNonce = 1, extra = {}) => ({ id, version, versionNonce, type: 'rectangle', ...extra });
const silent = { error() {}, log() {}, warn() {} };

// Minimal fake of the bits of the Mongoose model the store uses
const fakeBoard = (initial = {}) => {
  const db = { ...initial }; // boardId -> elements[]
  const writes = [];
  let failNext = 0;
  return {
    db,
    writes,
    failTimes(n) { failNext = n; },
    findById(id) {
      return { select: () => ({ lean: async () => (db[id] ? { _id: id, elements: db[id] } : null) }) };
    },
    async updateOne({ _id }, { $set }) {
      if (failNext > 0) { failNext--; throw new Error('db down'); }
      if (!db[_id]) return { matchedCount: 0 };
      db[_id] = $set.elements;
      writes.push(_id);
      return { matchedCount: 1 };
    },
  };
};

const mk = (Board, opts = {}) =>
  createSceneStore({ BoardModel: Board, flushDebounceMs: 20, flushMaxWaitMs: 100, retryDelayMs: 20, logger: silent, ...opts });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('loads from DB, merges deltas by version, reports only winners', async () => {
  const Board = fakeBoard({ b1: [el('a', 5)] });
  const store = mk(Board);
  const r1 = await store.applyDelta('b1', [el('a', 3), el('b', 1)]); // a is stale
  assert.deepEqual(r1.changed.map((e) => e.id), ['b']);
  const r2 = await store.applyDelta('b1', [el('a', 6)]);
  assert.deepEqual(r2.changed.map((e) => e.id), ['a']);
  assert.equal((await store.getElements('b1')).length, 2);
  store.stop();
});

test('debounces writes and persists the merged scene', async () => {
  const Board = fakeBoard({ b1: [] });
  const store = mk(Board);
  await store.applyDelta('b1', [el('a', 1)]);
  await store.applyDelta('b1', [el('b', 1)]);
  assert.equal(Board.writes.length, 0); // not yet
  await sleep(80);
  assert.equal(Board.writes.length, 1); // one batched write
  assert.deepEqual(Board.db.b1.map((e) => e.id).sort(), ['a', 'b']);
  store.stop();
});

test('a collaborator edit is saved even though nobody "saves"', async () => {
  const Board = fakeBoard({ b1: [] });
  const store = mk(Board);
  await store.applyDelta('b1', [el('x', 1)]);
  await store.flush('b1');
  assert.equal(Board.db.b1.length, 1);
  store.stop();
});

test('failed DB write is retried and data is not lost', async () => {
  const Board = fakeBoard({ b1: [] });
  Board.failTimes(1);
  const store = mk(Board);
  await store.applyDelta('b1', [el('a', 1)]);
  await store.flush('b1'); // fails once, schedules retry
  assert.equal(Board.db.b1.length, 0);
  await sleep(80);
  assert.equal(Board.db.b1.length, 1);
  store.stop();
});

test('clear wipes memory and DB', async () => {
  const Board = fakeBoard({ b1: [el('a', 1)] });
  const store = mk(Board);
  await store.clear('b1');
  assert.equal((await store.getElements('b1')).length, 0);
  assert.equal(Board.db.b1.length, 0);
  store.stop();
});

test('unknown board throws and is not cached', async () => {
  const store = mk(fakeBoard({}));
  await assert.rejects(() => store.applyDelta('nope', [el('a', 1)]), /not found/i);
  assert.equal(store.size(), 0);
  store.stop();
});

test('old tombstones are pruned on write, recent ones kept', async () => {
  const t = Date.now();
  const Board = fakeBoard({
    b1: [
      el('old', 2, 1, { isDeleted: true, updated: t - 30 * 24 * 3600 * 1000 }),
      el('recent', 2, 1, { isDeleted: true, updated: t - 1000 }),
      el('live', 1),
    ],
  });
  const store = mk(Board);
  await store.applyDelta('b1', [el('live', 2)]);
  await store.flush('b1');
  assert.deepEqual(Board.db.b1.map((e) => e.id).sort(), ['live', 'recent']);
  store.stop();
});

test('scene size cap rejects new ids but still allows updates', async () => {
  const { LIMITS } = require('../utils/sceneValidation');
  const initial = Array.from({ length: LIMITS.MAX_SCENE_ELEMENTS }, (_, i) => el(`e${i}`, 1));
  const Board = fakeBoard({ b1: initial });
  const store = mk(Board);
  const r = await store.applyDelta('b1', [el('brand_new', 1), el('e0', 2)]);
  assert.equal(r.dropped, 1);
  assert.deepEqual(r.changed.map((e) => e.id), ['e0']);
  store.stop();
});

test('deleted board: write finds nothing and the entry is dropped', async () => {
  const Board = fakeBoard({ b1: [] });
  const store = mk(Board);
  await store.applyDelta('b1', [el('a', 1)]);
  delete Board.db.b1;
  await store.flush('b1');
  assert.equal(store.size(), 0);
  store.stop();
});
