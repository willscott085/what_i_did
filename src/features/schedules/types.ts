export type ScheduleStatus = "active" | "snoozed" | "dismissed" | "completed";

export type Schedule = {
  id: string;
  itemId: string;
  reminderTime: string;
  rrule: string | null;
  snoozedUntil: string | null;
  cloneOnFire: boolean;
  status: ScheduleStatus;
  dateCreated: string;
  dateUpdated: string;
};

export type ScheduleWithItem = Schedule & {
  itemTitle: string;
  itemType: string;
};

export type ScheduleHistory = {
  id: string;
  scheduleId: string;
  firedAt: string;
  action: "notified" | "task_created" | "snoozed" | "dismissed";
  createdItemId: string | null;
};

/** UI-friendly recurrence pattern for building RRULE strings */
export type RecurrencePattern = {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byDay?: string[];
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
