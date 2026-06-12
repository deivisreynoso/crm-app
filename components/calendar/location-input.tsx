"use client";

interface LocationInputProps {
  isVirtual: boolean;
  location: string;
  onVirtualChange: (virtual: boolean) => void;
  onLocationChange: (value: string) => void;
}

export function LocationInput({
  isVirtual,
  location,
  onVirtualChange,
  onLocationChange,
}: LocationInputProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isVirtual}
          onChange={(e) => onVirtualChange(e.target.checked)}
        />
        <span className="font-medium text-heading">Virtual / Google Meet</span>
        <span className="text-body-muted font-normal">
          (Meet link generated when Google Calendar is connected)
        </span>
      </label>
      {!isVirtual && (
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            Location
          </label>
          <input
            className="input-field w-full"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Street address or meeting room"
          />
        </div>
      )}
    </div>
  );
}
