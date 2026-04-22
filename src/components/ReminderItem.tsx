import {
  BellIcon,
  ClipboardCheckIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "~/components/ui/button";
import { describeRRule } from "~/features/schedules/recurrence";
import type { ScheduleWithItem } from "~/features/schedules/types";

interface ReminderItemProps {
  schedule: ScheduleWithItem;
  /**
   * Current time, provided by the parent so a single ticking clock drives
   * every visible reminder (see `useNow` in the parent view).
   */
  now: Date;
  onEdit?: (schedule: ScheduleWithItem) => void;
  onDelete?: (scheduleId: string) => void;
}

function formatNextOccurrence(date: Date, now: Date): string {
  if (date.getTime() <= now.getTime()) return "Overdue";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function ReminderItem({
  schedule,
  now,
  onEdit,
  onDelete,
}: ReminderItemProps) {
  const effectiveTime = schedule.snoozedUntil ?? schedule.reminderTime;
  const effectiveDate = new Date(effectiveTime);
  const isOverdue = effectiveDate.getTime() <= now.getTime();
  const recurrenceText = schedule.rrule ? describeRRule(schedule.rrule) : null;

  return (
    <div className="group/reminder relative">
      <div className="flex min-w-0 items-start gap-2">
        {/* Icon */}
        <div className="flex h-7.5 items-center">
          {schedule.cloneOnFire ? (
            <ClipboardCheckIcon className="text-muted-foreground/50 size-5" />
          ) : (
            <BellIcon className="text-muted-foreground/50 size-5" />
          )}
        </div>

        {/* Content */}
        <div className="relative flex min-w-0 grow flex-col">
          <div className="flex items-center gap-2">
            <span className="flex h-7.5 min-w-0 flex-1 items-center truncate text-sm">
              {schedule.itemTitle}
            </span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className={isOverdue ? "text-destructive" : undefined}>
              {formatNextOccurrence(effectiveDate, now)}
            </span>
            {schedule.status === "snoozed" && (
              <>
                <span className="bg-border size-0.5 rounded-full" />
                <span>Snoozed</span>
              </>
            )}
            {recurrenceText && (
              <>
                <span className="bg-border size-0.5 rounded-full" />
                <span className="capitalize">{recurrenceText}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {onEdit && (
          <div className="flex h-7.5 items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 opacity-0 group-hover/reminder:opacity-100"
              onClick={() => onEdit(schedule)}
              aria-label="Edit reminder"
            >
              <PencilIcon className="size-3.5" />
            </Button>
          </div>
        )}
        {onDelete && (
          <div className="flex h-7.5 items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:text-destructive size-7 opacity-0 group-hover/reminder:opacity-100"
              onClick={() => onDelete(schedule.id)}
              aria-label="Delete reminder"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
