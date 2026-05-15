import { Link, useMatches } from "@tanstack/react-router";
import {
  BellIcon,
  CalendarCheckIcon,
  FileTextIcon,
  InboxIcon,
  TagIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "~/utils/utils";

const tabs = [
  {
    to: "/day/$date" as const,
    getParams: () => ({ date: format(new Date(), "yyyy-MM-dd") }),
    label: "Today",
    icon: CalendarCheckIcon,
    matchPrefix: "/day/",
  },
  {
    to: "/backlog" as const,
    getParams: undefined,
    label: "Backlog",
    icon: InboxIcon,
    matchPrefix: "/backlog",
  },
  {
    to: "/notes" as const,
    getParams: undefined,
    label: "Notes",
    icon: FileTextIcon,
    matchPrefix: "/notes",
  },
  {
    to: "/reminders" as const,
    getParams: undefined,
    label: "Reminders",
    icon: BellIcon,
    matchPrefix: "/reminders",
  },
  {
    to: "/tags" as const,
    getParams: undefined,
    label: "Tags",
    icon: TagIcon,
    matchPrefix: "/tag",
  },
] as const;

export function BottomNav() {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "";

  return (
    <nav
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => {
        const isActive = currentPath.startsWith(tab.matchPrefix);
        const Icon = tab.icon;

        const linkProps = tab.getParams
          ? { to: tab.to, params: tab.getParams() }
          : { to: tab.to };

        return (
          <Link
            key={tab.label}
            {...linkProps}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground active:text-foreground",
            )}
          >
            <Icon className="size-5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
