"use client";

import { format, subDays } from "date-fns";

export interface AnalyticsDateRange {
  start_date: string;
  end_date: string;
}

interface AnalyticsDateFiltersProps {
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
}

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Year to date", days: -1 },
] as const;

function defaultRange(): AnalyticsDateRange {
  const end = new Date();
  const start = subDays(end, 30);
  return {
    start_date: format(start, "yyyy-MM-dd"),
    end_date: format(end, "yyyy-MM-dd"),
  };
}

export function getDefaultAnalyticsRange(): AnalyticsDateRange {
  return defaultRange();
}

export function AnalyticsDateFilters({
  value,
  onChange,
}: AnalyticsDateFiltersProps) {
  function applyPreset(days: number) {
    const end = new Date();
    let start: Date;
    if (days < 0) {
      start = new Date(end.getFullYear(), 0, 1);
    } else {
      start = subDays(end, days);
    }
    onChange({
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 surface-card p-4">
      <div>
        <label className="text-xs font-medium text-body-muted block mb-1">From</label>
        <input
          type="date"
          className="input-field"
          value={value.start_date}
          onChange={(e) =>
            onChange({ ...value, start_date: e.target.value })
          }
        />
      </div>
      <div>
        <label className="text-xs font-medium text-body-muted block mb-1">To</label>
        <input
          type="date"
          className="input-field"
          value={value.end_date}
          onChange={(e) => onChange({ ...value, end_date: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap gap-2 pb-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--sidebar-hover)] text-body-muted hover:text-heading transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
