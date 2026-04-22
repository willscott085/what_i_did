import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useEffect } from "react";
import { isToday, isTomorrow, isThisWeek, isPast } from "date-fns";
import { useAppLayout } from "~/components/AppLayoutContext";
import { ReminderItem } from "~/components/ReminderItem";
import { Button } from "~/components/ui/button";
import { useDeleteSchedule } from "~/features/schedules/mutations";
import { schedulesQueryOptions } from "~/features/schedules/queries";
import type { ScheduleWithItem } from "~/features/schedules/types";
import { useNow } from "~/hooks/useNow";

export const Route = createFileRoute("/_app/reminders")({
  head: () => ({
    meta: [{ title: "Reminders - whatIdid" }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(schedulesQueryOptions());
    return null;
  },
  component: RemindersView,
});

type GroupKey = "overdue" | "today" | "tomorrow" | "thisWeek" | "later";

function groupSchedules(
  schedules: ScheduleWithItem[],
): Record<GroupKey, ScheduleWithItem[]> {
  const groups: Record<GroupKey, ScheduleWithItem[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  for (const s of schedules) {
    const effectiveTime = s.snoozedUntil ?? s.reminderTime;
    const date = new Date(effectiveTime);

    if (isPast(date) && !isToday(date)) {
      groups.overdue.push(s);
    } else if (isToday(date)) {
      groups.today.push(s);
    } else if (isTomorrow(date)) {
      groups.tomorrow.push(s);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      groups.thisWeek.push(s);
    } else {
      groups.later.push(s);
    }
  }

  return groups;
}

const GROUP_LABELS: Record<GroupKey, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This Week",
  later: "Later",
};

const GROUP_ORDER: GroupKey[] = [
  "overdue",
  "today",
  "tomorrow",
  "thisWeek",
  "later",
];

function RemindersView() {
  const { setDefaultStartDate, setDefaultTagIds, handleOpenReminderDialog } =
    useAppLayout();

  useEffect(() => {
    setDefaultStartDate(undefined);
    setDefaultTagIds(undefined);
  }, [setDefaultStartDate, setDefaultTagIds]);

  const { data: schedules = [] } = useQuery(schedulesQueryOptions());
  const { mutate: deleteSchedule } = useDeleteSchedule();

  // One ticking clock for the whole view — passed down to every ReminderItem
  // so we don't spin up a timer per row.
  const now = useNow(30_000);

  const groups = groupSchedules(schedules);

  function handleEdit(schedule: ScheduleWithItem) {
    handleOpenReminderDialog(schedule);
  }

  function handleDelete(scheduleId: string) {
    deleteSchedule(scheduleId);
  }

  const hasAny = schedules.length > 0;

  return (
    <div className="flex min-h-full flex-col justify-center">
      <section>
        <header className="flex items-center gap-2 pl-8">
          <h2 className="text-lg font-medium">Reminders</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenReminderDialog(null)}
            aria-label="Add reminder"
          >
            <PlusIcon className="size-5" />
          </Button>
        </header>

        {!hasAny && (
          <div className="text-muted-foreground mt-12 text-center text-sm">
            <p>No reminders yet.</p>
            <p className="mt-1">Create one to get started.</p>
          </div>
        )}

        {hasAny && (
          <div className="mt-2">
            {GROUP_ORDER.map((key) => {
              const items = groups[key];
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <div className="text-muted-foreground/20 py-1 pl-8 tracking-[0.3em] select-none">
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      {GROUP_LABELS[key]}
                    </span>
                  </div>
                  <div className="pl-8">
                    {items.map((schedule) => (
                      <ReminderItem
                        key={schedule.id}
                        schedule={schedule}
                        now={now}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
