// Payload validation and sanitization for Excalidraw scene updates.
// Keeps malformed, oversized, prototype-polluting, or Mongo-operator-injected
// payloads out of WebSocket rooms and MongoDB.

// 'image' is excluded because binary files (`files`) are not persisted yet.
const ALLOWED_TYPES = new Set([
  'rectangle',
  'diamond',
  'ellipse',
  'arrow',
  'line',
  'freedraw',
  'text',
  'frame',
  'magicframe',
  'embeddable',
  'iframe',
]);

const LIMITS = {
  MAX_ELEMENTS_PER_EVENT: 300, // Per socket delta event
  MAX_ELEMENTS_PER_SAVE: 20000, // Per HTTP PUT save
  MAX_ELEMENT_BYTES: 256 * 1024, // Max serialized bytes per element
  MAX_SCENE_ELEMENTS: 20000, // Max total elements (including tombstones) per board
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Recursively inspects an object or array for MongoDB operator injection (`$`, `.`),
 * prototype pollution (`__proto__`), or excessive nesting depth (> 8).
 * @param {unknown} value - Value to inspect.
 * @param {number} [depth=0] - Current recursion depth.
 * @returns {boolean} True if any unsafe key or excessive nesting is found.
 */
const hasUnsafeKeys = (value, depth = 0) => {
  if (value === null || typeof value !== 'object') return false;
  if (depth > 8) return true;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (hasUnsafeKeys(item, depth + 1)) return true;
    }
    return false;
  }
  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key.startsWith('$') || key.includes('.')) return true;
    if (hasUnsafeKeys(value[key], depth + 1)) return true;
  }
  return false;
};

/**
 * Validates a single Excalidraw element's schema, numeric coordinates, safety, and size.
 * @param {unknown} el - Candidate element object.
 * @param {boolean} checkSize - Whether to enforce MAX_ELEMENT_BYTES.
 * @returns {boolean} True if the element is valid and safe to store/relay.
 */
const isValidElement = (el, checkSize) => {
  if (!el || typeof el !== 'object' || Array.isArray(el)) return false;
  if (typeof el.id !== 'string' || !ID_PATTERN.test(el.id)) return false;
  if (!ALLOWED_TYPES.has(el.type)) return false;
  if (!Number.isInteger(el.version) || el.version < 0) return false;
  if (!Number.isInteger(el.versionNonce)) return false;
  if (el.isDeleted !== undefined && typeof el.isDeleted !== 'boolean') return false;
  for (const k of ['x', 'y', 'width', 'height']) {
    if (el[k] !== undefined && !Number.isFinite(el[k])) return false;
  }
  if (hasUnsafeKeys(el)) return false;
  if (checkSize && JSON.stringify(el).length > LIMITS.MAX_ELEMENT_BYTES) return false;
  return true;
};

/**
 * Filters an incoming array of Excalidraw elements, returning only valid entries
 * and reporting any dropped elements or top-level validation errors.
 * @param {unknown} elements - Candidate element array.
 * @param {{ maxCount?: number, checkSize?: boolean }} [opts] - Validation limits.
 * @returns {{ valid: object[], dropped: number, error?: 'not_array'|'too_many' }}
 */
const validateElements = (
  elements,
  { maxCount = LIMITS.MAX_ELEMENTS_PER_EVENT, checkSize = true } = {}
) => {
  if (!Array.isArray(elements)) return { valid: [], dropped: 0, error: 'not_array' };
  if (elements.length > maxCount) {
    return { valid: [], dropped: elements.length, error: 'too_many' };
  }
  const valid = [];
  for (const el of elements) {
    if (isValidElement(el, checkSize)) valid.push(el);
  }
  return { valid, dropped: elements.length - valid.length };
};

/**
 * Validates that a color string is a safe hex code (#RGB to #RRGGBBAA) or 'transparent'.
 * @param {unknown} c - Candidate color value.
 * @returns {boolean} True if valid.
 */
const isValidColor = (c) =>
  typeof c === 'string' && /^(#[0-9a-fA-F]{3,8}|transparent)$/.test(c);

/**
 * Extracts and validates only the persistable subset of Excalidraw's appState.
 * @param {unknown} appState - Candidate appState object from the client.
 * @returns {{ viewBackgroundColor?: string, gridSize?: number|null }} Sanitized appState.
 */
const sanitizeAppState = (appState) => {
  const out = {};
  if (!appState || typeof appState !== 'object') return out;
  if (isValidColor(appState.viewBackgroundColor)) {
    out.viewBackgroundColor = appState.viewBackgroundColor;
  }
  if (appState.gridSize === null || Number.isFinite(appState.gridSize)) {
    out.gridSize = appState.gridSize;
  }
  return out;
};

module.exports = {
  ALLOWED_TYPES,
  LIMITS,
  validateElements,
  sanitizeAppState,
  isValidColor,
};
