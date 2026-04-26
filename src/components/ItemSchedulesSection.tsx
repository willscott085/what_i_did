import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BellIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { DateTimePicker } from "~/components/DateTimePicker";
import { RecurrencePicker } from "~/components/RecurrencePicker";
import {
  useCreateSchedule,
  useDeleteSchedule,
} from "~/features/schedules/mutations";
import { schedulesForItemQueryOptions } from "~/features/schedules/queries";
import { describeRRule } from "~/features/schedules/recurrence";

interface ItemSchedulesSectionProps {
  itemId: string;
}

/**
 * Imperative API exposed via ref so the parent dialog can commit any pending
 * (in-progress, unsaved) reminder when the user submits the parent form. The
 * inline "Add reminder" button still works for explicit commits, but the
 * common flow is to fill the form and click the parent Save button — we
 * don't want to silently discard the user's input in that case.
 */
export interface ItemSchedulesSectionHandle {
  commitPending: () => Promise<void>;
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultNextHour(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalDatetimeValue(d.toISOString());
}

/**
 * Inline reminders manager for an existing item (task or note). Lists
 * existing schedules attached to the item and lets the user attach a new
 * one. Used inside TaskDialog and NoteDialog.
 */
export const ItemSchedulesSection = forwardRef<
  ItemSchedulesSectionHandle,
  ItemSchedulesSectionProps
>(function ItemSchedulesSection({ itemId }, ref) {
  const { data: schedules = [] } = useQuery(
    schedulesForItemQueryOptions(itemId),
  );

  const [adding, setAdding] = useState(false);
  const [reminderTime, setReminderTime] = useState(defaultNextHour);
  const [rrule, setRrule] = useState<string | null>(null);

  const { mutateAsync: createSchedule, isPending: isCreating } =
    useCreateSchedule();
  const { mutate: deleteSchedule } = useDeleteSchedule();

  // Mirror the latest form state + mutation into refs so the imperative
  // `commitPending` always sees current values without rebinding on every
  // keystroke. Writes happen in an effect so we don't mutate refs during
  // render (react-hooks/refs).
  const stateRef = useRef({ adding, reminderTime, rrule });
  const createScheduleRef = useRef(createSchedule);

  useEffect(() => {
    stateRef.current = { adding, reminderTime, rrule };
  }, [adding, reminderTime, rrule]);

  useEffect(() => {
    createScheduleRef.current = createSchedule;
  }, [createSchedule]);

  function resetForm() {
    setReminderTime(defaultNextHour());
    setRrule(null);
  }

  async function commitPending() {
    const { adding: a, reminderTime: t, rrule: r } = stateRef.current;
    if (!a || !t) return;
    await createScheduleRef.current({
      itemId,
      reminderTime: new Date(t).toISOString(),
      rrule: r ?? undefined,
    });
    resetForm();
    setAdding(false);
  }

  useImperativeHandle(ref, () => ({ commitPending }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Reminders</Label>
        {!adding && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
          >
            <PlusIcon className="size-3.5" />
            Add
          </Button>
        )}
      </div>

      {schedules.length === 0 && !adding && (
        <p className="text-muted-foreground text-xs">No reminders set.</p>
      )}

      {schedules.length > 0 && (
        <ul className="space-y-1">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="border-border/50 group/sch flex items-center gap-2 rounded-md border px-2 py-1.5"
            >
              <BellIcon className="text-muted-foreground/70 size-4 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs">
                  {format(new Date(s.reminderTime), "PPp")}
                </span>
                {s.rrule && (
                  <span className="text-muted-foreground truncate text-xs capitalize">
                    {describeRRule(s.rrule)}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 opacity-0 group-hover/sch:opacity-100"
                onClick={() => deleteSchedule(s.id)}
                aria-label="Delete reminder"
                title="Delete reminder"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="border-border/50 space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="item-schedule-time">Date &amp; Time</Label>
            <DateTimePicker
              id="item-schedule-time"
              value={reminderTime}
              onChange={setReminderTime}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Repeat</Label>
            <RecurrencePicker value={rrule} onChange={setRrule} />
          </div>
          <p className="text-muted-foreground text-xs">
            Saved when you click Save below.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isCreating || !reminderTime}
              onClick={commitPending}
            >
              Add reminder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
