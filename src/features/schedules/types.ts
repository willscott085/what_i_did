export type ScheduleStatus = "active" | "snoozed" | "dismissed" | "completed";

export type Schedule = {
  id: string;
  itemId: string;
  /** ISO-8601 datetime string */
  reminderTime: string;
  rrule: string | null;
  /** ISO-8601 datetime string, or null if not snoozed */
  snoozedUntil: string | null;
  cloneOnFire: boolean;
  status: ScheduleStatus;
  /** ISO-8601 datetime string */
  dateCreated: string;
  /** ISO-8601 datetime string */
  dateUpdated: string;
};

export type ScheduleWithItem = Schedule & {
  itemTitle: string;
  itemType: string;
};

export type ScheduleHistory = {
  id: string;
  scheduleId: string;
  /** ISO-8601 datetime string */
  firedAt: string;
  action: "task_created" | "dismissed";
  createdItemId: string | null;
};

export type ScheduleHistoryEntry = ScheduleHistory & {
  /** Title of the item the schedule is (or was) attached to. */
  itemTitle: string | null;
  /** Title of the cloned task item, if any. */
  createdItemTitle: string | null;
};

export type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

/** UI-friendly recurrence pattern for building RRULE strings */
export type RecurrencePattern = {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byDay?: Weekday[];
  until?: string;
  count?: number;
};

export type CreateScheduleInput = {
  itemId: string;
  reminderTime: string;
  rrule?: string;
  cloneOnFire?: boolean;
};

export type UpdateScheduleInput = {
  id: string;
  reminderTime?: string;
  rrule?: string | null;
  cloneOnFire?: boolean;
};

export type CreateEventWithScheduleInput = {
  title: string;
  content?: string;
  date?: string;
  tagIds?: string[];
  reminderTime: string;
  rrule?: string;
  cloneOnFire?: boolean;
};
