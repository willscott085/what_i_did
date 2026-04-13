import { useEffect, useState } from "react";

/**
 * Returns a tick value that increments every `intervalMs` (default 60s).
 * Components using this hook will re-render on each tick, allowing
 * overdue checks to re-evaluate against `Date.now()`.
 */
export function useOverdueCheck(intervalMs = 60_000) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
