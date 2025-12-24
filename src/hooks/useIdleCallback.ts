import { useEffect } from "react";

/**
 * 兼容性 requestIdleCallback API 的 hooks
 * 由于浏览器的 requestIdleCallback API在某些浏览器中可能不可用，因此我们需要提供一个回退方案。（https://bugs.webkit.org/show_bug.cgi?id=164193）
 * @param callback 这个回调函数将在浏览器空闲时被调用。
 * @param deps 这个依赖数组将决定这个回调函数何时被调用。
 */
export function useIdleCallback<T>(callback: unknown, deps: T[] = []) {
  useEffect(() => {
    const requestIdle =
      window.requestIdleCallback ||
      function (cb) {
        return setTimeout(() => {
          const start = Date.now();
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          });
        }, 1000);
      };

    const handle = requestIdle(callback as IdleRequestCallback);

    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
