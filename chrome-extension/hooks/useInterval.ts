import { useEffect, useRef } from 'react';

/**
 * useInterval Hook
 *
 * Memory-safe interval hook with pause capability
 *
 * @example
 * useInterval(() => {
 *   console.log('Runs every second');
 * }, 1000);
 *
 * @example
 * const [paused, setPaused] = useState(false);
 * useInterval(() => {
 *   fetchData();
 * }, 5000, paused);
 */
export function useInterval(
  callback: () => void,
  delay: number | null,
  paused: boolean = false
) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    // Don't schedule if no delay is specified or paused
    if (delay === null || paused) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);

    // Cleanup on unmount or when delay/paused changes
    return () => clearInterval(id);
  }, [delay, paused]);
}
