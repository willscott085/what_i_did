/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import * as React from "react";
import type { QueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import { ReloadPrompt } from "~/components/ReloadPrompt";
import appCss from "~/styles/app.css?url";
import { seo } from "~/utils/seo";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "theme-color",
        content: "#0f172a",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      ...seo({
        title: "whatIdid — Task Tracker, Notes & Reminders",
        description:
          "Personal task tracker, notes system, and reminder app with AI-powered features.",
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#ffffff" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html className="bg-background font-sans antialiased">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `
#app-loader{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:oklch(1 0 0)}
#app-loader .spinner{width:24px;height:24px;border:2px solid oklch(.9 0 0);border-top-color:oklch(.5 0 0);border-radius:50%;animation:spin .6s linear infinite}
@media(prefers-color-scheme:dark){
#app-loader{background:oklch(.13 .028 261.692)}
#app-loader .spinner{border-color:oklch(.3 .005 285.82);border-top-color:oklch(.65 .005 285.82)}
}
@keyframes spin{to{transform:rotate(360deg)}}
body:has([data-hydrated]) #app-loader{display:none}`,
          }}
        />
      </head>
      <body data-lpignore="true" data-1p-ignore data-form-type="other">
        <div id="app-loader">
          <div className="spinner" />
        </div>
        {children}
        <ReloadPrompt />
        <Toaster position="bottom-center" />
        <Scripts />
      </body>
    </html>
  );
}
