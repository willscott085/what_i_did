import { useState } from "react";
import { ClockIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import type { SnoozeDuration } from "~/features/schedules/consts";

interface SnoozeMenuProps {
  onSnooze: (duration: SnoozeDuration) => void;
  /** Extra className applied to the trigger button. */
  triggerClassName?: string;
}

const PRESETS: ReadonlyArray<{ duration: SnoozeDuration; label: string }> = [
  { duration: "5m", label: "5 minutes" },
  { duration: "15m", label: "15 minutes" },
  { duration: "1h", label: "1 hour" },
  { duration: "tomorrow9am", label: "Tomorrow, 9am" },
];

export function SnoozeMenu({ onSnooze, triggerClassName }: SnoozeMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (duration: SnoozeDuration) => {
    onSnooze(duration);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={triggerClassName}
          aria-label="Snooze reminder"
        >
          <ClockIcon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <div className="text-muted-foreground px-2 pt-1 pb-1 text-xs font-medium tracking-wider uppercase">
          Snooze for
        </div>
        <div className="flex flex-col">
          {PRESETS.map((preset) => (
            <button
              key={preset.duration}
              type="button"
              className="hover:bg-accent hover:text-accent-foreground rounded-sm px-2 py-1.5 text-left text-sm"
              onClick={() => handleSelect(preset.duration)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
