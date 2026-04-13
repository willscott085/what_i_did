import * as rruleModule from "rrule";
// CJS/ESM interop: namespace import may have RRule at top level or nested under .default
const RRule = (
  "default" in rruleModule
    ? ((rruleModule as Record<string, any>).default.RRule ??
      (rruleModule as Record<string, any>).default)
    : (rruleModule as Record<string, any>).RRule
) as typeof import("rrule").RRule;

export enum RecurrencePreset {
  NONE = "none",
  DAILY = "daily",
  WEEKDAYS = "weekdays",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  CUSTOM = "custom",
}

export interface CustomRecurrenceOptions {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byDay?: number[];
  endDate?: Date;
  count?: number;
}

const freqMap: Record<CustomRecurrenceOptions["freq"], number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

export function createRecurrenceRule(
  preset: RecurrencePreset,
  options?: CustomRecurrenceOptions,
): string | null {
  if (preset === RecurrencePreset.NONE) return null;

  if (preset === RecurrencePreset.CUSTOM && options) {
    const rule = new RRule({
      freq: freqMap[options.freq],
      interval: options.interval,
      byweekday: options.byDay,
      until: options.endDate,
      count: options.count,
    });
    return rule.toString();
  }

  const presetRules: Record<string, InstanceType<typeof RRule>> = {
    [RecurrencePreset.DAILY]: new RRule({ freq: RRule.DAILY }),
    [RecurrencePreset.WEEKDAYS]: new RRule({
      freq: RRule.WEEKLY,
      byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
    }),
    [RecurrencePreset.WEEKLY]: new RRule({ freq: RRule.WEEKLY }),
    [RecurrencePreset.BIWEEKLY]: new RRule({
      freq: RRule.WEEKLY,
      interval: 2,
    }),
    [RecurrencePreset.MONTHLY]: new RRule({ freq: RRule.MONTHLY }),
    [RecurrencePreset.YEARLY]: new RRule({ freq: RRule.YEARLY }),
  };

  const rule = presetRules[preset];
  return rule ? rule.toString() : null;
}

export function getNextOccurrence(
  rruleString: string,
  completedDate: Date,
): Date | null {
  const rule = RRule.fromString(rruleString);
  const after = rule.after(completedDate, false);
  return after;
}

export function describeRecurrence(rruleString: string): string {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.toText();
  } catch {
    return "Custom recurrence";
  }
}

export function detectPreset(rruleString: string | null): RecurrencePreset {
  if (!rruleString) return RecurrencePreset.NONE;

  const normalized = rruleString.replace(/^RRULE:/, "");

  for (const preset of [
    RecurrencePreset.DAILY,
    RecurrencePreset.WEEKDAYS,
    RecurrencePreset.WEEKLY,
    RecurrencePreset.BIWEEKLY,
    RecurrencePreset.MONTHLY,
    RecurrencePreset.YEARLY,
  ] as const) {
    const rule = createRecurrenceRule(preset);
    if (rule && rule.replace(/^RRULE:/, "") === normalized) {
      return preset;
    }
  }

  return RecurrencePreset.CUSTOM;
}
