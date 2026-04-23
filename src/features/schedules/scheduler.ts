import { and, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "~/db";
import { items, schedules } from "~/db/schema";
import { fireScheduleImpl } from "./fire-impl";
import { sendPushNotification } from "./push";

const POLL_INTERVAL_MS = 30_000;
let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Kick off the server-side scheduler. Safe to call many times — only the
 * first invocation wires up the interval.
 *
 * On each tick, any active/snoozed schedule whose effective fire time has
 * elapsed is fired (task clone + history entry) and a push notification is
 * dispatched to the owning user. Missed schedules during downtime fire
 * immediately on the next tick.
 */
export function startScheduler(): void {
  if (started) return;
  started = true;
  console.info(
    `[scheduler] Starting — polling every ${POLL_INTERVAL_MS / 1000}s`,
  );
  // Fire immediately on boot so schedules missed during downtime catch up
  void runTick();
  timer = setInterval(() => {
    void runTick();
  }, POLL_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}

async function runTick(): Promise<void> {
  try {
    const now = new Date().toISOString();

    const due = await db
      .select({
        id: schedules.id,
        itemId: schedules.itemId,
        status: schedules.status,
        title: items.title,
        userId: items.userId,
      })
      .from(schedules)
      .innerJoin(items, eq(items.id, schedules.itemId))
      .where(
        and(
          inArray(schedules.status, ["active", "snoozed"]),
          or(
            and(
              eq(schedules.status, "active"),
              lte(schedules.reminderTime, now),
            ),
            and(
              eq(schedules.status, "snoozed"),
              isNotNull(schedules.snoozedUntil),
              lte(sql`${schedules.snoozedUntil}`, now),
            ),
          ),
        ),
      );

    if (due.length === 0) return;

    console.info(`[scheduler] Firing ${due.length} due schedule(s)`);

    for (const row of due) {
      try {
        const result = await fireScheduleImpl(row.id, row.userId);
        console.info(
          `[scheduler] Fired ${row.id} (${row.title}) fired=${result.fired}`,
        );
        if (result.fired) {
          await sendPushNotification(row.userId, {
            title: "Reminder",
            body: row.title,
            url: "/reminders",
          });
        }
      } catch (err) {
        console.error(`[scheduler] Failed on schedule ${row.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[scheduler] Tick failed:", err);
  }
}
