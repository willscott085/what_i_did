import { describe, it, expect } from "vitest";
import {
  RecurrencePreset,
  createRecurrenceRule,
  getNextOccurrence,
  describeRecurrence,
  detectPreset,
} from "./recurrence";

describe("createRecurrenceRule", () => {
  it("should return null for NONE preset", () => {
    expect(createRecurrenceRule(RecurrencePreset.NONE)).toBeNull();
  });

  it("should create a daily RRULE", () => {
    const rule = createRecurrenceRule(RecurrencePreset.DAILY);
    expect(rule).toContain("FREQ=DAILY");
  });

  it("should create a weekdays RRULE with MO-FR", () => {
    const rule = createRecurrenceRule(RecurrencePreset.WEEKDAYS);
    expect(rule).toContain("FREQ=WEEKLY");
    expect(rule).toContain("BYDAY=MO,TU,WE,TH,FR");
  });

  it("should create a weekly RRULE", () => {
    const rule = createRecurrenceRule(RecurrencePreset.WEEKLY);
    expect(rule).toContain("FREQ=WEEKLY");
    expect(rule).not.toContain("INTERVAL");
  });

  it("should create a biweekly RRULE with interval 2", () => {
    const rule = createRecurrenceRule(RecurrencePreset.BIWEEKLY);
    expect(rule).toContain("FREQ=WEEKLY");
    expect(rule).toContain("INTERVAL=2");
  });

  it("should create a monthly RRULE", () => {
    const rule = createRecurrenceRule(RecurrencePreset.MONTHLY);
    expect(rule).toContain("FREQ=MONTHLY");
  });

  it("should create a yearly RRULE", () => {
    const rule = createRecurrenceRule(RecurrencePreset.YEARLY);
    expect(rule).toContain("FREQ=YEARLY");
  });

  it("should create a custom RRULE with interval", () => {
    const rule = createRecurrenceRule(RecurrencePreset.CUSTOM, {
      freq: "daily",
      interval: 3,
    });
    expect(rule).toContain("FREQ=DAILY");
    expect(rule).toContain("INTERVAL=3");
  });

  it("should create a custom RRULE with byDay", () => {
    const rule = createRecurrenceRule(RecurrencePreset.CUSTOM, {
      freq: "weekly",
      interval: 1,
      byDay: [0, 2, 4],
    });
    expect(rule).toContain("FREQ=WEEKLY");
    expect(rule).toContain("BYDAY");
  });

  it("should create a custom RRULE with count", () => {
    const rule = createRecurrenceRule(RecurrencePreset.CUSTOM, {
      freq: "monthly",
      interval: 1,
      count: 5,
    });
    expect(rule).toContain("FREQ=MONTHLY");
    expect(rule).toContain("COUNT=5");
  });

  it("should return null for CUSTOM without options", () => {
    const rule = createRecurrenceRule(RecurrencePreset.CUSTOM);
    expect(rule).toBeNull();
  });
});

describe("getNextOccurrence", () => {
  it("should return the next daily occurrence after a given date", () => {
    const rule = createRecurrenceRule(RecurrencePreset.DAILY)!;
    const after = new Date("2025-06-15T10:00:00Z");
    const next = getNextOccurrence(rule, after);

    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(after.getTime());
  });

  it("should return the next weekly occurrence after the given date", () => {
    const rule = createRecurrenceRule(RecurrencePreset.WEEKLY)!;
    const after = new Date("2025-06-15T10:00:00Z");
    const next = getNextOccurrence(rule, after);

    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(after.getTime());
  });

  it("should return the next monthly occurrence", () => {
    const rule = createRecurrenceRule(RecurrencePreset.MONTHLY)!;
    const after = new Date("2025-01-15T10:00:00Z");
    const next = getNextOccurrence(rule, after);

    expect(next).not.toBeNull();
    expect(next!.getMonth()).not.toBe(after.getMonth());
  });

  it("should skip weekends for weekday recurrence", () => {
    const rule = createRecurrenceRule(RecurrencePreset.WEEKDAYS)!;
    // Friday June 13, 2025
    const friday = new Date("2025-06-13T10:00:00Z");
    const next = getNextOccurrence(rule, friday);

    expect(next).not.toBeNull();
    // Should be Monday (day 1), not Saturday or Sunday
    const dayOfWeek = next!.getDay();
    expect(dayOfWeek).toBeGreaterThanOrEqual(1); // Monday
    expect(dayOfWeek).toBeLessThanOrEqual(5); // Friday
  });
});

describe("describeRecurrence", () => {
  it("should describe a daily rule in human-readable text", () => {
    const rule = createRecurrenceRule(RecurrencePreset.DAILY)!;
    const description = describeRecurrence(rule);
    expect(description.toLowerCase()).toContain("day");
  });

  it("should describe a weekly rule", () => {
    const rule = createRecurrenceRule(RecurrencePreset.WEEKLY)!;
    const description = describeRecurrence(rule);
    expect(description.toLowerCase()).toContain("week");
  });

  it("should return fallback for invalid RRULE string", () => {
    const description = describeRecurrence("INVALID_RRULE");
    expect(description).toBe("Custom recurrence");
  });
});

describe("detectPreset", () => {
  it("should return NONE for null input", () => {
    expect(detectPreset(null)).toBe(RecurrencePreset.NONE);
  });

  it("should detect DAILY preset", () => {
    const rule = createRecurrenceRule(RecurrencePreset.DAILY);
    expect(detectPreset(rule)).toBe(RecurrencePreset.DAILY);
  });

  it("should detect WEEKDAYS preset", () => {
    const rule = createRecurrenceRule(RecurrencePreset.WEEKDAYS);
    expect(detectPreset(rule)).toBe(RecurrencePreset.WEEKDAYS);
  });

  it("should detect WEEKLY preset", () => {
    const rule = createRecurrenceRule(RecurrencePreset.WEEKLY);
    expect(detectPreset(rule)).toBe(RecurrencePreset.WEEKLY);
  });

  it("should detect BIWEEKLY preset", () => {
    const rule = createRecurrenceRule(RecurrencePreset.BIWEEKLY);
    expect(detectPreset(rule)).toBe(RecurrencePreset.BIWEEKLY);
  });

  it("should detect MONTHLY preset", () => {
    const rule = createRecurrenceRule(RecurrencePreset.MONTHLY);
    expect(detectPreset(rule)).toBe(RecurrencePreset.MONTHLY);
  });

  it("should detect YEARLY preset", () => {
    const rule = createRecurrenceRule(RecurrencePreset.YEARLY);
    expect(detectPreset(rule)).toBe(RecurrencePreset.YEARLY);
  });

  it("should return CUSTOM for non-standard RRULE", () => {
    const rule = createRecurrenceRule(RecurrencePreset.CUSTOM, {
      freq: "daily",
      interval: 3,
    });
    expect(detectPreset(rule)).toBe(RecurrencePreset.CUSTOM);
  });

  it("should handle RRULE: prefix correctly", () => {
    const rule = createRecurrenceRule(RecurrencePreset.DAILY)!;
    // Add or verify prefix handling
    const withPrefix = rule.startsWith("RRULE:") ? rule : `RRULE:${rule}`;
    const withoutPrefix = rule.replace(/^RRULE:/, "");
    // Both forms should detect correctly
    expect(detectPreset(withPrefix)).toBe(RecurrencePreset.DAILY);
    expect(detectPreset(withoutPrefix)).toBe(RecurrencePreset.DAILY);
  });
});
