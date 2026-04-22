import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { buildRRule, describeRRule } from "~/features/schedules/recurrence";
import type { RecurrencePattern, Weekday } from "~/features/schedules/types";
import { cn } from "~/utils/utils";

type Preset = "none" | "daily" | "weekly" | "monthly" | "custom";

interface RecurrencePickerProps {
  value: string | null;
  onChange: (rrule: string | null) => void;
}

const ALL_DAYS: { value: Weekday; label: string; name: string }[] = [
  { value: "MO", label: "M", name: "Monday" },
  { value: "TU", label: "T", name: "Tuesday" },
  { value: "WE", label: "W", name: "Wednesday" },
  { value: "TH", label: "T", name: "Thursday" },
  { value: "FR", label: "F", name: "Friday" },
  { value: "SA", label: "S", name: "Saturday" },
  { value: "SU", label: "S", name: "Sunday" },
];

function rruleToPreset(rrule: string | null): Preset {
  if (!rrule) return "none";
  const upper = rrule.toUpperCase();
  if (upper.includes("FREQ=DAILY") && upper.includes("INTERVAL=1"))
    return "daily";
  if (
    upper.includes("FREQ=WEEKLY") &&
    upper.includes("INTERVAL=1") &&
    !upper.includes("BYDAY")
  )
    return "weekly";
  if (upper.includes("FREQ=MONTHLY") && upper.includes("INTERVAL=1"))
    return "monthly";
  return "custom";
}

function rruleToPattern(rrule: string | null): RecurrencePattern {
  if (!rrule) return { freq: "weekly", interval: 1 };

  const upper = rrule.toUpperCase();
  let freq: RecurrencePattern["freq"] = "weekly";
  if (upper.includes("FREQ=DAILY")) freq = "daily";
  else if (upper.includes("FREQ=WEEKLY")) freq = "weekly";
  else if (upper.includes("FREQ=MONTHLY")) freq = "monthly";
  else if (upper.includes("FREQ=YEARLY")) freq = "yearly";

  const intervalMatch = upper.match(/INTERVAL=(\d+)/);
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;

  const byDayMatch = upper.match(/BYDAY=([A-Z,]+)/);
  const byDay = byDayMatch
    ? (byDayMatch[1].split(",") as Weekday[])
    : undefined;

  return { freq, interval, byDay };
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [preset, setPreset] = useState<Preset>(() => rruleToPreset(value));
  const [pattern, setPattern] = useState<RecurrencePattern>(() =>
    rruleToPattern(value),
  );

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "none") {
      onChange(null);
      return;
    }
    if (p === "custom") {
      // Keep current pattern, emit it
      const rrule = buildRRule(pattern);
      onChange(rrule);
      return;
    }

    const freqMap: Record<string, RecurrencePattern["freq"]> = {
      daily: "daily",
      weekly: "weekly",
      monthly: "monthly",
    };
    const newPattern: RecurrencePattern = {
      freq: freqMap[p]!,
      interval: 1,
    };
    setPattern(newPattern);
    onChange(buildRRule(newPattern));
  }

  function updatePattern(updates: Partial<RecurrencePattern>) {
    const newPattern = { ...pattern, ...updates };
    setPattern(newPattern);
    onChange(buildRRule(newPattern));
  }

  const description = value ? describeRRule(value) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(["none", "daily", "weekly", "monthly", "custom"] as Preset[]).map(
          (p) => (
            <Button
              key={p}
              type="button"
              variant={preset === p ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(p)}
            >
              {p === "none" ? "None" : p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ),
        )}
      </div>

      {preset === "custom" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-sm">Every</Label>
            <Input
              type="number"
              min={1}
              max={365}
              className="w-20"
              value={pattern.interval}
              onChange={(e) =>
                updatePattern({
                  interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
            />
            <Select
              value={pattern.freq}
              onValueChange={(v) =>
                updatePattern({
                  freq: v as RecurrencePattern["freq"],
                  byDay: v === "weekly" ? pattern.byDay : undefined,
                })
              }
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  {pattern.interval > 1 ? "days" : "day"}
                </SelectItem>
                <SelectItem value="weekly">
                  {pattern.interval > 1 ? "weeks" : "week"}
                </SelectItem>
                <SelectItem value="monthly">
                  {pattern.interval > 1 ? "months" : "month"}
                </SelectItem>
                <SelectItem value="yearly">
                  {pattern.interval > 1 ? "years" : "year"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pattern.freq === "weekly" && (
            <div className="flex gap-1">
              {ALL_DAYS.map((day) => {
                const selected = pattern.byDay?.includes(day.value) ?? false;
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-label={day.name}
                    aria-pressed={selected}
                    title={day.name}
                    onClick={() => {
                      const current = pattern.byDay ?? [];
                      const next = selected
                        ? current.filter((d) => d !== day.value)
                        : [...current, day.value];
                      updatePattern({
                        byDay: next.length > 0 ? next : undefined,
                      });
                    }}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {description && (
        <p className="text-muted-foreground text-xs capitalize">
          {description}
        </p>
      )}
    </div>
  );
}
