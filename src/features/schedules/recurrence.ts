import { RRule } from "rrule";
import type { RecurrencePattern, Weekday } from "./types";

const FREQ_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
} as const;

const DAY_MAP: Record<Weekday, (typeof RRule)["MO"]> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

/** Get the next occurrence after a given date (defaults to now) */
export function getNextOccurrence(
  rruleStr: string,
  after: Date = new Date(),
): Date | null {
  const rule = RRule.fromString(rruleStr);
  return rule.after(after);
}

/** Get all occurrences within a date range (inclusive) */
export function getOccurrences(rruleStr: string, from: Date, to: Date): Date[] {
  const rule = RRule.fromString(rruleStr);
  return rule.between(from, to, true);
}

/** Build an RRULE string from a UI-friendly pattern */
export function buildRRule(pattern: RecurrencePattern): string {
  const options: ConstructorParameters<typeof RRule>[0] = {
    freq: FREQ_MAP[pattern.freq],
    interval: pattern.interval,
  };

  if (pattern.byDay && pattern.byDay.length > 0) {
    options.byweekday = pattern.byDay.map((d) => DAY_MAP[d]);
  }

  if (pattern.until) {
    options.until = new Date(pattern.until);
  }

  if (pattern.count !== undefined) {
    options.count = pattern.count;
  }

  const rule = new RRule(options);
  return rule.toString();
}

/** Describe an RRULE as a human-readable string */
export function describeRRule(rruleStr: string): string {
  const rule = RRule.fromString(rruleStr);
  return rule.toText();
}
