// Hand-rolled service worker. Kept in `public/` so TanStack Start / Nitro
// picks it up in the public-asset manifest at build time (generated SWs from
// vite-plugin-pwa land in `.output/public/` *after* Nitro bakes its static
// file list, which caused /sw.js to 404 and broke push registration).
//
// Responsibilities:
//   - Activate immediately on install/update (skipWaiting + clientsClaim)
//   - Handle Web Push events
//   - Forward foreground pushes to visible clients via postMessage
//   - Focus/open a window on notification click

/* global self, console */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.info("[sw] push event", { hasData: !!event.data });
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: "Reminder", body: event.data ? event.data.text() : "" };
    }
  })();

  const title = payload.title || "Reminder";
  const body = payload.body || "";
  const url = payload.url || "/reminders";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const focused = windowClients.some(
        (c) => c.focused || c.visibilityState === "visible",
      );

      console.info("[sw] push: clients=", windowClients.length, "focused=", focused);

      if (focused) {
        for (const client of windowClients) {
          client.postMessage({
            type: "reminder",
            data: { title, body, url },
          });
        }
        console.info("[sw] push: posted message to visible clients");
        return;
      }

      await self.registration.showNotification(title, {
        body,
        tag: "whatidid-reminder",
        data: { url },
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
      });
      console.info("[sw] push: showNotification called");
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/reminders";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windowClients.find((c) => c.url.includes(url));
      if (existing) {
        await existing.focus();
        return;
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
