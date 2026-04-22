import {
  BellIcon,
  CheckIcon,
  ClipboardCheckIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { Button } from "~/components/ui/button";
import { SnoozeMenu } from "~/components/SnoozeMenu";
import type { SnoozeDuration } from "~/features/schedules/consts";
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
  onSnooze?: (scheduleId: string, duration: SnoozeDuration) => void;
  onDismiss?: (schedule: ScheduleWithItem) => void;
}

function formatNextOccurrence(date: Date, now: Date): string {
  if (date.getTime() <= now.getTime()) return "Overdue";
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatSnoozedUntil(date: Date): string {
  if (isToday(date)) return `Snoozed until ${format(date, "p")}`;
  return `Snoozed until ${format(date, "PPp")}`;
}

export function ReminderItem({
  schedule,
  now,
  onEdit,
  onDelete,
  onSnooze,
  onDismiss,
}: ReminderItemProps) {
  const effectiveTime = schedule.snoozedUntil ?? schedule.reminderTime;
  const effectiveDate = new Date(effectiveTime);
  const isOverdue = effectiveDate.getTime() <= now.getTime();
  const recurrenceText = schedule.rrule ? describeRRule(schedule.rrule) : null;
  const isSnoozed = schedule.status === "snoozed" && !!schedule.snoozedUntil;
  const isRecurring = !!schedule.rrule;

  const dismissLabel = isRecurring ? "Mark complete" : "Dismiss reminder";

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
            {isSnoozed && (
              <>
                <span className="bg-border size-0.5 rounded-full" />
                <span>
                  {formatSnoozedUntil(new Date(schedule.snoozedUntil!))}
                </span>
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
        {onSnooze && (
          <div className="flex h-7.5 items-center">
            <SnoozeMenu
              onSnooze={(duration) => onSnooze(schedule.id, duration)}
              triggerClassName="size-7 opacity-0 group-hover/reminder:opacity-100 data-[state=open]:opacity-100"
            />
          </div>
        )}
        {onDismiss && (
          <div className="flex h-7.5 items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 opacity-0 group-hover/reminder:opacity-100"
              onClick={() => onDismiss(schedule)}
              aria-label={dismissLabel}
              title={dismissLabel}
            >
              <CheckIcon className="size-3.5" />
            </Button>
          </div>
        )}
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
