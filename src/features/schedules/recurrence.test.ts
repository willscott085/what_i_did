import { describe, it, expect } from "vitest";
import {
  buildRRule,
  getNextOccurrence,
  getOccurrences,
  describeRRule,
} from "./recurrence";

describe("buildRRule", () => {
  it("builds a daily rule", () => {
    const rrule = buildRRule({ freq: "daily", interval: 1 });
    expect(rrule).toContain("FREQ=DAILY");
    expect(rrule).toContain("INTERVAL=1");
  });

  it("builds a weekly rule with specific days", () => {
    const rrule = buildRRule({
      freq: "weekly",
      interval: 1,
      byDay: ["MO", "WE", "FR"],
    });
    expect(rrule).toContain("FREQ=WEEKLY");
    expect(rrule).toContain("BYDAY");
  });

  it("builds a rule with count", () => {
    const rrule = buildRRule({ freq: "daily", interval: 1, count: 5 });
    expect(rrule).toContain("COUNT=5");
  });

  it("builds a rule with until date", () => {
    const rrule = buildRRule({
      freq: "monthly",
      interval: 1,
      until: "2025-12-31T00:00:00Z",
    });
    expect(rrule).toContain("UNTIL=");
  });

  it("builds a rule with interval > 1", () => {
    const rrule = buildRRule({ freq: "daily", interval: 3 });
    expect(rrule).toContain("INTERVAL=3");
  });
});

describe("getNextOccurrence", () => {
  it("returns the next date after a given date", () => {
    const rrule = buildRRule({ freq: "daily", interval: 1 });
    const after = new Date("2025-01-15T10:00:00Z");
    const next = getNextOccurrence(rrule, after);
    expect(next).toBeInstanceOf(Date);
    expect(next!.getTime()).toBeGreaterThan(after.getTime());
  });

  it("returns null for a completed rule", () => {
    const rrule = buildRRule({
      freq: "daily",
      interval: 1,
      count: 1,
    });
    // After the only occurrence, there should be no next
    const farFuture = new Date("2099-01-01T00:00:00Z");
    const next = getNextOccurrence(rrule, farFuture);
    expect(next).toBeNull();
  });

  it("defaults to now when no after date provided", () => {
    const rrule = buildRRule({ freq: "daily", interval: 1 });
    const next = getNextOccurrence(rrule);
    expect(next).toBeInstanceOf(Date);
  });
});

describe("getOccurrences", () => {
  it("returns occurrences within a date range", () => {
    const rrule = buildRRule({ freq: "daily", interval: 1 });
    const now = new Date();
    const from = now;
    const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const occurrences = getOccurrences(rrule, from, to);
    expect(occurrences.length).toBeGreaterThanOrEqual(7);
  });

  it("returns empty array for range with no occurrences", () => {
    const rrule = buildRRule({
      freq: "yearly",
      interval: 1,
      count: 1,
    });
    const from = new Date("2099-06-01T00:00:00Z");
    const to = new Date("2099-06-30T23:59:59Z");
    const occurrences = getOccurrences(rrule, from, to);
    expect(occurrences).toHaveLength(0);
  });

  it("respects interval spacing", () => {
    const rrule = buildRRule({ freq: "daily", interval: 3 });
    const from = new Date("2025-01-01T00:00:00Z");
    const to = new Date("2025-01-10T23:59:59Z");
    const occurrences = getOccurrences(rrule, from, to);
    if (occurrences.length >= 2) {
      const diff = occurrences[1].getTime() - occurrences[0].getTime();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      expect(diff).toBe(threeDays);
    }
  });
});

describe("describeRRule", () => {
  it("describes a daily rule", () => {
    const rrule = buildRRule({ freq: "daily", interval: 1 });
    const desc = describeRRule(rrule);
    expect(desc.toLowerCase()).toContain("day");
  });

  it("describes a weekly rule", () => {
    const rrule = buildRRule({ freq: "weekly", interval: 1 });
    const desc = describeRRule(rrule);
    expect(desc.toLowerCase()).toContain("week");
  });

  it("describes a monthly rule", () => {
    const rrule = buildRRule({ freq: "monthly", interval: 1 });
    const desc = describeRRule(rrule);
    expect(desc.toLowerCase()).toContain("month");
  });
});
