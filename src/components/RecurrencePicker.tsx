import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  RecurrencePreset,
  createRecurrenceRule,
  describeRecurrence,
  detectPreset,
} from "~/utils/recurrence";

const presets = [
  { value: RecurrencePreset.NONE, label: "None" },
  { value: RecurrencePreset.DAILY, label: "Daily" },
  { value: RecurrencePreset.WEEKDAYS, label: "Weekdays" },
  { value: RecurrencePreset.WEEKLY, label: "Weekly" },
  { value: RecurrencePreset.BIWEEKLY, label: "Biweekly" },
  { value: RecurrencePreset.MONTHLY, label: "Monthly" },
  { value: RecurrencePreset.YEARLY, label: "Yearly" },
] as const;

const weekdays = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
] as const;

const frequencies = [
  { value: "daily" as const, label: "Day(s)" },
  { value: "weekly" as const, label: "Week(s)" },
  { value: "monthly" as const, label: "Month(s)" },
  { value: "yearly" as const, label: "Year(s)" },
];

interface RecurrencePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const currentPreset = detectPreset(value);
  const [showCustom, setShowCustom] = useState(
    currentPreset === RecurrencePreset.CUSTOM,
  );
  const [customFreq, setCustomFreq] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("weekly");
  const [customInterval, setCustomInterval] = useState(1);
  const [customDays, setCustomDays] = useState<number[]>([]);

  function handlePresetClick(preset: RecurrencePreset) {
    if (preset === RecurrencePreset.CUSTOM) {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    onChange(createRecurrenceRule(preset));
  }

  function handleCustomApply() {
    const rule = createRecurrenceRule(RecurrencePreset.CUSTOM, {
      freq: customFreq,
      interval: customInterval,
      byDay:
        customFreq === "weekly" && customDays.length > 0
          ? customDays
          : undefined,
    });
    onChange(rule);
  }

  function toggleDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            type="button"
            variant={
              !showCustom && currentPreset === preset.value
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => handlePresetClick(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          variant={showCustom ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(RecurrencePreset.CUSTOM)}
        >
          Custom…
        </Button>
      </div>

      {showCustom && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Every</span>
            <input
              type="number"
              min={1}
              max={365}
              value={customInterval}
              onChange={(e) => setCustomInterval(Number(e.target.value) || 1)}
              className="border-input bg-background h-8 w-16 rounded-md border px-2 text-sm"
            />
            <select
              value={customFreq}
              onChange={(e) =>
                setCustomFreq(
                  e.target.value as "daily" | "weekly" | "monthly" | "yearly",
                )
              }
              className="border-input bg-background h-8 rounded-md border px-2 text-sm"
            >
              {frequencies.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {customFreq === "weekly" && (
            <div className="flex flex-wrap gap-1.5">
              {weekdays.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={
                    customDays.includes(day.value) ? "default" : "outline"
                  }
                  size="sm"
                  className="w-10 px-0"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          )}

          <Button type="button" size="sm" onClick={handleCustomApply}>
            Apply
          </Button>
        </div>
      )}

      {value && (
        <p className="text-muted-foreground text-xs">
          {describeRecurrence(value)}
        </p>
      )}
    </div>
  );
}
