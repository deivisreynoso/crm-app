"use client";

import { LOCATION_TYPES } from "@/lib/calendar/utils";

interface LocationInputProps {
  locationType: string;
  location: string;
  onTypeChange: (type: string) => void;
  onLocationChange: (value: string) => void;
}

export function LocationInput({
  locationType,
  location,
  onTypeChange,
  onLocationChange,
}: LocationInputProps) {
  const meta = LOCATION_TYPES.find((t) => t.value === locationType);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-heading mb-1">
          Meeting type
        </label>
        <select
          className="input-field w-full"
          value={locationType}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          {LOCATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-heading mb-1">
          Location / link
        </label>
        <input
          className="input-field w-full"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder={meta?.placeholder ?? "Meeting details"}
        />
      </div>
    </div>
  );
}
