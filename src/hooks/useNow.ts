import { useEffect, useState } from "react";

/**
 * Re-renders the component every `intervalMs` milliseconds, returning the
 * current Date. Use for UIs that display relative time strings
 * (e.g. "in 2 minutes", "Overdue") which would otherwise go stale.
 *
 * The interval is cleared when the tab is hidden to avoid wasted work, and
 * restarted (with an immediate tick) when the tab becomes visible again.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      setNow(new Date());
      timer = setInterval(() => setNow(new Date()), intervalMs);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs]);

  return now;
}
