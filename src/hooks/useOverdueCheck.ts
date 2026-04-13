import { useSyncExternalStore } from "react";

/**
 * Shared singleton ticker — one interval regardless of how many
 * components subscribe. Increments every `60s` so overdue checks
 * re-evaluate against the current time.
 */
let tick = 0;
let timerId: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  subscriberCount++;

  if (subscriberCount === 1) {
    timerId = setInterval(() => {
      tick++;
      for (const listener of listeners) listener();
    }, 60_000);
  }

  return () => {
    listeners.delete(callback);
    subscriberCount--;

    if (subscriberCount === 0 && timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };
}

function getSnapshot() {
  return tick;
}

function getServerSnapshot() {
  return 0;
}

export function useOverdueCheck() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
