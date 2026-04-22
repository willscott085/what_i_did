import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/utils/utils";

type Mode = "date" | "datetime";

interface DateTimePickerProps {
  /**
   * Serialized value:
   * - mode="date": "yyyy-MM-dd" (or empty string when no value)
   * - mode="datetime": "yyyy-MM-ddTHH:mm"
   */
  value: string;
  onChange: (value: string) => void;
  mode?: Mode;
  id?: string;
  className?: string;
  /** Placeholder shown in the trigger when no value is selected. */
  placeholder?: string;
}

const DATE_FORMAT = "yyyy-MM-dd";
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

function parseValue(value: string, mode: Mode): Date | null {
  if (!value) return null;
  const fmt = mode === "date" ? DATE_FORMAT : DATETIME_FORMAT;
  const d = parse(value, fmt, new Date());
  return isValid(d) ? d : null;
}

function formatValue(date: Date, mode: Mode): string {
  return format(date, mode === "date" ? DATE_FORMAT : DATETIME_FORMAT);
}

export function DateTimePicker({
  value,
  onChange,
  mode = "datetime",
  id,
  className,
  placeholder,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseValue(value, mode);

  const defaultPlaceholder =
    mode === "date" ? "Pick a date" : "Pick a date & time";
  const displayText = selectedDate
    ? mode === "date"
      ? format(selectedDate, "PP")
      : format(selectedDate, "PPp")
    : (placeholder ?? defaultPlaceholder);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={`${id ?? "dtp"}-trigger`}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className,
          )}
          aria-label={placeholder ?? defaultPlaceholder}
        >
          <CalendarIcon className="mr-2 size-4" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        data-vaul-no-drag
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <PickerBody
          id={id}
          mode={mode}
          selectedDate={selectedDate}
          onChange={onChange}
        />
      </PopoverContent>
    </Popover>
  );
}

interface PickerBodyProps {
  id?: string;
  mode: Mode;
  selectedDate: Date | null;
  onChange: (value: string) => void;
}

function PickerBody({ id, mode, selectedDate, onChange }: PickerBodyProps) {
  // State lives in this child so it's initialized fresh from `selectedDate`
  // each time the popover opens (component mounts) — no effect needed.
  const [dateText, setDateText] = useState(
    selectedDate ? format(selectedDate, DATE_FORMAT) : "",
  );
  const timeValue = selectedDate ? format(selectedDate, "HH:mm") : "";

  function commitDate(day: Date) {
    const base = selectedDate ?? new Date();
    const next = new Date(day);
    if (mode === "datetime") {
      next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    onChange(formatValue(next, mode));
    setDateText(format(next, DATE_FORMAT));
  }

  function handleDateTextChange(text: string) {
    setDateText(text);
    const parsed = parse(text, DATE_FORMAT, new Date());
    if (isValid(parsed)) commitDate(parsed);
  }

  function handleTimeChange(timeStr: string) {
    if (!timeStr) return;
    const [h, m] = timeStr.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const base = selectedDate ?? new Date();
    const next = new Date(base);
    next.setHours(h, m, 0, 0);
    onChange(formatValue(next, mode));
  }

  return (
    <>
      <div className="border-border border-b p-3">
        <Input
          // Use the caller-provided id so <Label htmlFor> targets a real
          // input — enables .getByLabel(...) selectors in tests.
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          value={dateText}
          onChange={(e) => handleDateTextChange(e.target.value)}
          className="h-8"
        />
      </div>
      <div className="p-3">
        <DayPicker
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(d) => d && commitDate(d)}
          defaultMonth={selectedDate ?? undefined}
          weekStartsOn={1}
          showOutsideDays
          classNames={{
            root: "text-sm",
            months: "flex flex-col gap-4",
            month: "flex flex-col gap-3",
            month_caption: "flex items-center justify-center h-8 font-medium",
            caption_label: "text-sm",
            nav: "flex items-center gap-1",
            button_previous:
              "size-7 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
            button_next:
              "size-7 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
            month_grid: "w-full border-collapse",
            weekdays: "flex",
            weekday:
              "text-muted-foreground w-8 text-center text-[11px] font-normal",
            week: "flex w-full",
            day: "size-8 p-0 text-center align-middle",
            day_button:
              "size-8 rounded-md hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center text-sm",
            selected:
              "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
            today: "[&>button]:font-semibold [&>button]:underline",
            outside: "text-muted-foreground/40",
            disabled: "opacity-40",
            hidden: "invisible",
          }}
        />
      </div>
      {mode === "datetime" && (
        <div className="border-border flex items-center gap-2 border-t p-3">
          <label
            htmlFor={`${id ?? "dtp"}-time`}
            className="text-muted-foreground text-xs"
          >
            Time
          </label>
          <Input
            id={`${id ?? "dtp"}-time`}
            type="time"
            value={timeValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="h-8 flex-1"
          />
        </div>
      )}
    </>
  );
}
