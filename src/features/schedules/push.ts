import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { pushSubscriptions } from "~/db/schema";
import { serverEnv } from "~/config/env.server";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let configured = false;
let warnedMissing = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = serverEnv.VAPID_PUBLIC_KEY;
  const privateKey = serverEnv.VAPID_PRIVATE_KEY;
  const subject = serverEnv.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn(
        "[push] VAPID keys not configured — push notifications disabled. " +
          "Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT to enable.",
      );
    }
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  console.info("[push] VAPID configured");
  return true;
}

/**
 * Send a push notification to every subscription registered for `userId`.
 * Silently no-ops if VAPID keys are not configured. Stale subscriptions
 * (410/404) are pruned automatically.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!configure()) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) {
    console.info(`[push] No subscriptions for user ${userId}`);
    return;
  }

  console.info(
    `[push] Sending "${payload.title}" to ${subs.length} subscription(s)`,
  );

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body,
        );
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, s.endpoint));
        } else {
          console.error("Push send error:", err);
        }
      }
    }),
  );
}
