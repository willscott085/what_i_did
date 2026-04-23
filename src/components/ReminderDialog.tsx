import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { TagMultiSelect } from "~/components/TagMultiSelect";
import { RecurrencePicker } from "~/components/RecurrencePicker";
import { DateTimePicker } from "~/components/DateTimePicker";
import {
  useCreateEventWithSchedule,
  useUpdateSchedule,
} from "~/features/schedules/mutations";
import { useUpdateEvent } from "~/features/events/mutations";
import type { ScheduleWithItem } from "~/features/schedules/types";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: ScheduleWithItem | null;
}

export function ReminderDialog({
  open,
  onOpenChange,
  reminder,
}: ReminderDialogProps) {
  const formKey = `${open}-${reminder?.id ?? "new"}`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <ReminderDialogForm
          key={formKey}
          reminder={reminder}
          onOpenChange={onOpenChange}
        />
      </DrawerContent>
    </Drawer>
  );
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ReminderDialogForm({
  reminder,
  onOpenChange,
}: {
  reminder?: ScheduleWithItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!reminder;

  // `reminder` (a ScheduleWithItem) already carries every field we need to
  // prefill the form. The reminders list query is invalidated after any
  // mutation, so this prop is fresh — no secondary fetch required.
  const [title, setTitle] = useState(reminder?.itemTitle ?? "");
  const [content, setContent] = useState("");
  const [reminderTime, setReminderTime] = useState(() => {
    if (reminder?.reminderTime) {
      return toLocalDatetimeValue(reminder.reminderTime);
    }
    // Default to next hour
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalDatetimeValue(d.toISOString());
  });
  const [rrule, setRrule] = useState<string | null>(reminder?.rrule ?? null);
  const [cloneOnFire, setCloneOnFire] = useState(
    reminder?.cloneOnFire ?? false,
  );
  const [tagIds, setTagIds] = useState<string[]>([]);

  const { mutateAsync: createEventWithSchedule, isPending: isCreating } =
    useCreateEventWithSchedule();
  const { mutateAsync: updateEvent, isPending: isUpdatingEvent } =
    useUpdateEvent();
  const { mutateAsync: updateSchedule, isPending: isUpdatingSchedule } =
    useUpdateSchedule();

  const isPending = isCreating || isUpdatingEvent || isUpdatingSchedule;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !reminderTime) return;

    const isoTime = new Date(reminderTime).toISOString();

    if (isEditing && reminder) {
      // Update event title/content
      await updateEvent({
        id: reminder.itemId,
        title: title.trim(),
        content: content.trim() || null,
      });

      // Update schedule
      await updateSchedule({
        id: reminder.id,
        reminderTime: isoTime,
        rrule: rrule ?? null,
        cloneOnFire,
      });
    } else {
      await createEventWithSchedule({
        title: title.trim(),
        content: content.trim() || undefined,
        reminderTime: isoTime,
        rrule: rrule ?? undefined,
        cloneOnFire,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      });
    }

    onOpenChange(false);
  }

  return (
    <>
      <DrawerHeader className="shrink-0">
        <DrawerTitle>
          {isEditing ? "Edit Reminder" : "New Reminder"}
        </DrawerTitle>
      </DrawerHeader>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="scrollbar-hide flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div className="space-y-4 pb-16">
            {/* Title */}
            <div className="space-y-1.5 px-4">
              <Label htmlFor="reminder-title">Title</Label>
              <Input
                id="reminder-title"
                type="text"
                placeholder="Reminder title…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 px-4">
              <Label htmlFor="reminder-content">Description</Label>
              <Textarea
                id="reminder-content"
                placeholder="Optional description…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5 px-4">
              <Label htmlFor="reminder-time">Date &amp; Time</Label>
              <DateTimePicker
                id="reminder-time"
                value={reminderTime}
                onChange={setReminderTime}
              />
            </div>

            {/* Generates task toggle */}
            <div className="flex items-center justify-between px-4">
              <div>
                <Label htmlFor="reminder-clone">Generates task</Label>
                <p className="text-muted-foreground text-xs">
                  Creates a new task each time this fires
                </p>
              </div>
              <Switch
                id="reminder-clone"
                checked={cloneOnFire}
                onCheckedChange={setCloneOnFire}
              />
            </div>

            {/* Recurrence */}
            <div className="space-y-1.5 px-4">
              <Label>Repeat</Label>
              <RecurrencePicker value={rrule} onChange={setRrule} />
            </div>

            {/* Tags (create only) */}
            {!isEditing && (
              <div className="space-y-1.5 px-4">
                <Label>Tags</Label>
                <TagMultiSelect selectedTagIds={tagIds} onChange={setTagIds} />
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="bg-background border-border shrink-0 border-t p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !title.trim() || !reminderTime}
          >
            {isEditing ? "Save" : "Create"}
          </Button>
        </DrawerFooter>
      </form>
    </>
  );
}
