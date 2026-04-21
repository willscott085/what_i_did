export const DEFAULT_USER_ID = "1";

export const schedulesQueryKeys = {
  all: ["schedules"] as const,
  byId: (id: string) => ["schedules", id] as const,
  byItem: (itemId: string) => ["schedules", "byItem", itemId] as const,
  upcoming: ["schedules", "upcoming"] as const,
  recurring: ["schedules", "recurring"] as const,
};

/** Preset snooze durations in milliseconds */
export const SNOOZE_DURATIONS = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  tomorrow9am: "tomorrow9am",
} as const;

export type SnoozeDuration = keyof typeof SNOOZE_DURATIONS;
