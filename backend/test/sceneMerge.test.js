const test = require('node:test');
const assert = require('node:assert/strict');
const { isNewer, mergeElements } = require('../utils/sceneMerge');

const el = (id, version, versionNonce = 1, extra = {}) => ({ id, version, versionNonce, type: 'rectangle', ...extra });

test('higher version wins', () => {
  assert.equal(isNewer(el('a', 3), el('a', 2)), true);
  assert.equal(isNewer(el('a', 2), el('a', 3)), false);
});

test('tie breaks on lower versionNonce, deterministically on both sides', () => {
  const a = el('a', 2, 10);
  const b = el('a', 2, 20);
  assert.equal(isNewer(a, b), true);
  assert.equal(isNewer(b, a), false);
});

test('identical element is not "newer" (no echo loops)', () => {
  assert.equal(isNewer(el('a', 2, 5), el('a', 2, 5)), false);
});

test('missing current means newer', () => {
  assert.equal(isNewer(el('a', 0), undefined), true);
});

test('mergeElements keeps both sides and resolves conflicts', () => {
  const local = [el('a', 1), el('b', 5)];
  const remote = [el('a', 2, 1, { x: 9 }), el('b', 4), el('c', 1)];
  const merged = mergeElements(local, remote);
  const byId = Object.fromEntries(merged.map((e) => [e.id, e]));
  assert.equal(merged.length, 3);
  assert.equal(byId.a.version, 2);
  assert.equal(byId.a.x, 9);
  assert.equal(byId.b.version, 5);
  assert.ok(byId.c);
});

test('a delete (tombstone) with a higher version beats the live element', () => {
  const merged = mergeElements([el('a', 1)], [el('a', 2, 1, { isDeleted: true })]);
  assert.equal(merged[0].isDeleted, true);
});

test('merge is order independent', () => {
  const x = [el('a', 2, 9), el('b', 1)];
  const y = [el('a', 2, 3), el('c', 7)];
  const norm = (arr) => arr.map((e) => `${e.id}:${e.version}:${e.versionNonce}`).sort();
  assert.deepEqual(norm(mergeElements(x, y)), norm(mergeElements(y, x)));
});
