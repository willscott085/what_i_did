import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Client-only SW registration + update prompt. Replaces `vite-plugin-pwa`'s
 * `useRegisterSW` hook; we now ship a hand-rolled `public/sw.js` that Nitro
 * serves as a real static file. The PWA plugin's generated SW landed on disk
 * *after* Nitro baked its asset manifest, causing /sw.js to 404.
 */
export function ReloadPrompt() {
  const isClient = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!isClient) return null;

  return <ReloadPromptInner />;
}

function ReloadPromptInner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    const onWaiting = (registration: ServiceWorkerRegistration) => {
      if (cancelled) return;
      if (!registration.waiting) return;
      waitingRef.current = registration.waiting;
      setNeedRefresh(true);
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          type: "classic",
          updateViaCache: "none",
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          onWaiting(registration);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              onWaiting(registration);
            }
          });
        });

        updateIntervalRef.current = setInterval(
          () => {
            registration.update().catch(() => {});
          },
          60 * 60 * 1000,
        );
      } catch (err) {
        console.error("SW registration error:", err);
      }
    };

    void register();

    const onControllerChange = () => {
      if (waitingRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      cancelled = true;
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const activate = () => {
    const waiting = waitingRef.current;
    if (!waiting) {
      window.location.reload();
      return;
    }
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  if (!needRefresh) return null;

  return (
    <div className="border-border bg-card fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg">
      <p className="text-foreground text-sm">A new version is available.</p>
      <button
        className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
        onClick={activate}
      >
        Reload
      </button>
      <button
        className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm"
        onClick={() => setNeedRefresh(false)}
      >
        Dismiss
      </button>
    </div>
  );
}
