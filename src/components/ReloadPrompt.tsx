import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useRef, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

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
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="border-border bg-card fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg">
      <p className="text-foreground text-sm">A new version is available.</p>
      <button
        className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
        onClick={() => updateServiceWorker(true)}
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
