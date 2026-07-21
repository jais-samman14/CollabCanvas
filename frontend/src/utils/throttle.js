// src/utils/throttle.js

/**
 * Throttle a function to run at most once per `wait` milliseconds.
 * Perfect for high-frequency events like mousemove (60fps → ~16ms interval).
 * @param {Function} fn - Function to throttle
 * @param {number} wait - Minimum ms between calls (default 50 = 20fps)
 */
export const throttle = (fn, wait = 50) => {
  let lastTime = 0;
  let timeoutId = null;
  let lastArgs = null;

  return function throttled(...args) {
    const now = Date.now();
    const elapsed = now - lastTime;

    if (elapsed >= wait) {
      // Enough time passed → run immediately
      lastTime = now;
      fn.apply(this, args);
    } else {
      // Schedule for later → capture latest args
      lastArgs = args;
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastTime = Date.now();
          timeoutId = null;
          fn.apply(this, lastArgs);
        }, wait - elapsed);
      }
    }
  };
};