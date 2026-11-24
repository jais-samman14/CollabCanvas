/**
 * Throttles a high-frequency function so it executes at most once per `wait` ms,
 * preserving the trailing call with the most recent arguments.
 * Includes a `.cancel()` method to prevent stale timers firing after unmount.
 * @param {Function} fn - Callback to throttle.
 * @param {number} [wait=50] - Minimum interval in milliseconds (50ms = 20fps).
 * @returns {Function & { cancel: () => void }} Throttled function with cancel helper.
 */
export const throttle = (fn, wait = 50) => {
  let lastTime = 0;
  let timeoutId = null;
  let lastArgs = null;

  const throttled = function throttledFn(...args) {
    const now = Date.now();
    const elapsed = now - lastTime;

    if (elapsed >= wait) {
      lastTime = now;
      fn.apply(this, args);
    } else {
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

  /** Cancels any pending trailing invocation. */
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
};
