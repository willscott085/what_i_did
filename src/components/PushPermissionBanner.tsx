import { useEffect, useState } from "react";
import { BellIcon, BellOffIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  ensurePushSubscription,
  getNotificationPermission,
  isPushSupported,
  requestNotificationPermission,
} from "~/features/schedules/sw-registration";

type Status = NotificationPermission | "unsupported" | "unconfigured";

/**
 * Inline banner shown on the Reminders page. Prompts the user to enable push
 * notifications when supported but not yet granted. Hides itself silently if
 * the runtime doesn't support push or VAPID keys aren't configured.
 */
export function PushPermissionBanner() {
  const [status, setStatus] = useState<Status>("default");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unconfigured");
      return;
    }
    const perm = getNotificationPermission();
    setStatus(perm);
    // If permission is already granted, the browser may still lack a push
    // subscription (fresh install, cleared storage, server DB wiped, SW
    // reinstalled, etc.). Quietly re-run the subscribe flow so the endpoint
    // lands in the server DB without requiring another user click.
    if (perm === "granted") {
      void ensurePushSubscription().catch((err) => {
        console.warn("[push] background resubscribe failed:", err);
      });
    }
  }, []);

  async function handleEnable() {
    setPending(true);
    try {
      const result = await requestNotificationPermission();
      if (result === "granted") {
        try {
          await ensurePushSubscription();
          toast.success("Push notifications enabled");
        } catch (err) {
          console.error("Failed to subscribe for push notifications:", err);
          const msg =
            err instanceof Error ? err.message : "Subscription failed";
          toast.error(`Push setup failed: ${msg}`);
        }
      } else if (result === "denied") {
        toast.error("Notifications blocked — enable them in browser settings");
      }
      setStatus(result);
    } catch (err) {
      console.error("Notification permission request failed:", err);
      toast.error("Could not request notification permission");
    } finally {
      setPending(false);
    }
  }

  // Hide entirely when unsupported, unconfigured, or already granted
  if (status === "unsupported" || status === "unconfigured") return null;
  if (status === "granted") return null;

  if (status === "denied") {
    return (
      <div className="border-border bg-muted/40 text-muted-foreground mx-8 mt-4 flex items-start gap-3 rounded-md border p-3 text-sm">
        <BellOffIcon className="mt-0.5 size-4 shrink-0" />
        <p>
          Notifications are blocked. Enable them in your browser settings to
          receive reminders when the app is in the background.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-muted/40 mx-8 mt-4 flex items-start gap-3 rounded-md border p-3 text-sm">
      <BellIcon className="text-foreground mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="text-foreground font-medium">Enable push notifications</p>
        <p className="text-muted-foreground mt-0.5">
          Get notified when a reminder fires, even when the app is closed.
        </p>
      </div>
      <Button size="sm" onClick={handleEnable} disabled={pending}>
        {pending ? "Enabling…" : "Enable"}
      </Button>
    </div>
  );
}
