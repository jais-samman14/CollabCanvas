const test = require('node:test');
const assert = require('node:assert/strict');
const { validateElements, sanitizeAppState, LIMITS } = require('../utils/sceneValidation');

const good = (over = {}) => ({ id: 'abc_123-XY', type: 'rectangle', version: 1, versionNonce: 42, x: 1, y: 2, ...over });

test('accepts a normal element', () => {
  const r = validateElements([good()]);
  assert.equal(r.valid.length, 1);
  assert.equal(r.dropped, 0);
});

test('rejects non-arrays', () => {
  assert.equal(validateElements({}).error, 'not_array');
  assert.equal(validateElements(null).error, 'not_array');
});

test('rejects too many elements in one event', () => {
  const many = Array.from({ length: LIMITS.MAX_ELEMENTS_PER_EVENT + 1 }, (_, i) => good({ id: `id${i}` }));
  assert.equal(validateElements(many).error, 'too_many');
});

test('drops bad ids, types, versions and non-finite numbers', () => {
  const r = validateElements([
    good({ id: '' }),
    good({ id: 'has space' }),
    good({ id: 'x'.repeat(65) }),
    good({ type: 'image' }),
    good({ type: 'script' }),
    good({ version: -1 }),
    good({ version: 1.5 }),
    good({ versionNonce: 'a' }),
    good({ x: Infinity }),
    good({ isDeleted: 'yes' }),
    null,
    'str',
    good({ id: 'ok' }),
  ]);
  assert.equal(r.valid.length, 1);
  assert.equal(r.valid[0].id, 'ok');
  assert.equal(r.dropped, 12);
});

test('drops elements with Mongo-unsafe or prototype keys, even nested', () => {
  const evil = JSON.parse('{"id":"e1","type":"text","version":1,"versionNonce":1,"customData":{"$set":1}}');
  const dotted = good({ id: 'e2', customData: { 'a.b': 1 } });
  const proto = JSON.parse('{"id":"e3","type":"text","version":1,"versionNonce":1,"__proto__":{"x":1}}');
  const r = validateElements([evil, dotted, proto, good()]);
  assert.equal(r.valid.length, 1);
});

test('drops oversized elements only when checkSize is on', () => {
  const big = good({ id: 'big', points: new Array(LIMITS.MAX_ELEMENT_BYTES).fill(1) });
  assert.equal(validateElements([big]).valid.length, 0);
  assert.equal(validateElements([big], { checkSize: false }).valid.length, 1);
});

test('rejects absurdly deep nesting', () => {
  let deep = {};
  let cur = deep;
  for (let i = 0; i < 20; i++) { cur.n = {}; cur = cur.n; }
  assert.equal(validateElements([good({ customData: deep })]).valid.length, 0);
});

test('sanitizeAppState keeps only safe keys', () => {
  assert.deepEqual(
    sanitizeAppState({ viewBackgroundColor: '#fff', gridSize: 20, evil: 1, collaborators: {} }),
    { viewBackgroundColor: '#fff', gridSize: 20 }
  );
  assert.deepEqual(sanitizeAppState({ viewBackgroundColor: 'javascript:1', gridSize: null }), { gridSize: null });
  assert.deepEqual(sanitizeAppState(undefined), {});
});
