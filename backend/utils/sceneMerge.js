// Pure CRDT-style Last-Write-Wins (LWW) helpers for merging Excalidraw elements.
// The tie-breaking rule MUST match the client (ExcalidrawBoard.jsx):
// higher `version` wins; ties break deterministically on lower `versionNonce`.

/**
 * Determines whether a candidate element strictly supersedes the current element.
 * Commutative, associative, and idempotent across all peers to guarantee convergence.
 * @param {object} candidate - Incoming Excalidraw element.
 * @param {object|undefined} current - Existing stored element with the same ID.
 * @returns {boolean} True if candidate should replace current.
 */

const isNewer = (candidate, current) => {
  if (!current) return true;
  const cv = candidate.version ?? 0;
  const ov = current.version ?? 0;
  if (cv !== ov) return cv > ov;
  return (candidate.versionNonce ?? 0) < (current.versionNonce ?? 0);
};

/**
 * Merges a remote element array into a local element array without mutating inputs.
 * @param {object[]} [local=[]] - Local scene elements.
 * @param {object[]} [remote=[]] - Incoming remote scene elements.
 * @returns {object[]} New merged array containing the winning version of each element ID.
 */
const mergeElements = (local = [], remote = []) => {
  const byId = new Map();
  for (const el of local) byId.set(el.id, el);
  for (const el of remote) {
    if (isNewer(el, byId.get(el.id))) byId.set(el.id, el);
  }
  return Array.from(byId.values());
};

module.exports = { isNewer, mergeElements };
