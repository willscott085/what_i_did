import { toast } from "sonner";
import { clientEnv } from "~/config/env.client";
import { DEFAULT_USER_ID } from "./consts";
import { subscribePush, unsubscribePush } from "./server";

type ReminderMessage = {
  type: "reminder";
  data: { title: string; body: string; url?: string };
};

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Returns true when the runtime supports Web Push and a VAPID public key is
 * configured. Pages that rely on push should gate on this.
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  if (!clientEnv.VITE_VAPID_PUBLIC_KEY) return false;
  return true;
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Resolve the active SW registration with a hard timeout. `serviceWorker.ready`
 * blocks until a SW activates — in production (registerType: "prompt") a brand
 * new install can stall for seconds, and a broken SW stalls forever. Without a
 * timeout the calling UI wedges in its pending state.
 */
async function getRegistrationWithTimeout(
  timeoutMs = 8000,
): Promise<ServiceWorkerRegistration> {
  const ready = navigator.serviceWorker.ready;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            "Service worker did not activate in time — reload the page and try again",
          ),
        ),
      timeoutMs,
    ),
  );
  return Promise.race([ready, timeout]);
}

/**
 * Ensure the current browser has a push subscription registered with the
 * server. Should be called after notification permission is granted.
 */
export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  console.info("[push] ensurePushSubscription start");
  if (!isPushSupported()) {
    console.warn("[push] not supported in this runtime");
    return null;
  }
  const publicKey = clientEnv.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    console.warn(
      "[push] VITE_VAPID_PUBLIC_KEY missing — client cannot subscribe",
    );
    return null;
  }
  if (Notification.permission !== "granted") {
    console.warn(
      `[push] permission is ${Notification.permission} — skipping subscribe`,
    );
    return null;
  }

  const registration = await getRegistrationWithTimeout();
  console.info("[push] registration ready, state=", registration.active?.state);
  let sub = await registration.pushManager.getSubscription();

  if (!sub) {
    console.info(
      "[push] no existing subscription — calling pushManager.subscribe",
    );
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    console.info(
      "[push] subscribed, endpoint=",
      sub.endpoint.slice(0, 50) + "...",
    );
  } else {
    console.info(
      "[push] reusing existing browser subscription, endpoint=",
      sub.endpoint.slice(0, 50) + "...",
    );
  }

  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) {
    console.warn("[push] subscription missing keys — aborting server upsert", {
      hasP256dh: !!p256dh,
      hasAuth: !!auth,
    });
    return sub;
  }

  console.info("[push] calling subscribePush server fn...");
  try {
    const result = await subscribePush({
      data: {
        endpoint: sub.endpoint,
        p256dh,
        auth,
        userId: DEFAULT_USER_ID,
      },
    });
    console.info("[push] subscribePush server fn returned", result);
  } catch (err) {
    console.error("[push] subscribePush server fn threw:", err);
    throw err;
  }

  return sub;
}

export async function removePushSubscription(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await getRegistrationWithTimeout();
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;
  try {
    await sub.unsubscribe();
  } finally {
    await unsubscribePush({
      data: { endpoint: sub.endpoint, userId: DEFAULT_USER_ID },
    });
  }
}

/**
 * Wire the foreground message listener. When the SW receives a push while a
 * client is visible, it posts a `reminder` message instead of showing a
 * system notification. We translate that into a sonner toast and invoke the
 * optional callback (e.g. to invalidate react-query caches).
 */
export function initForegroundReminderListener(
  onReminder?: (data: ReminderMessage["data"]) => void,
): () => void {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return () => {};
  }
  const handler = (event: MessageEvent) => {
    const msg = event.data as ReminderMessage | undefined;
    if (!msg || msg.type !== "reminder") return;
    toast(msg.data.title, {
      description: msg.data.body,
      action: msg.data.url
        ? {
            label: "Open",
            onClick: () => {
              if (msg.data.url) window.location.assign(msg.data.url);
            },
          }
        : undefined,
    });
    onReminder?.(msg.data);
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
