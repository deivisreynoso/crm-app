"use client";

import { COUNTRIES } from "@/lib/constants/countries";
import { formatPhone, parsePhoneParts } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export function PhoneInput({
  value,
  onChange,
  className,
  id,
}: PhoneInputProps) {
  const { dialCode, number } = parsePhoneParts(value);

  function updateDialCode(nextDial: string) {
    onChange(formatPhone(nextDial, number));
  }

  function updateNumber(nextNumber: string) {
    onChange(formatPhone(dialCode, nextNumber));
  }

  return (
    <div className={cn("phone-input-group", className)}>
      <select
        value={dialCode}
        onChange={(e) => updateDialCode(e.target.value)}
        className="phone-dial-select"
        aria-label="Country calling code"
      >
        {COUNTRIES.map((c) => (
          <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
            {c.dialCode}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        value={number}
        onChange={(e) => updateNumber(e.target.value)}
        placeholder="Phone number"
        className="phone-number-input"
      />
    </div>
  );
}

export function PhoneInputInline({
  value,
  onSave,
}: {
  value?: string | null;
  onSave: (value: string) => Promise<void>;
}) {
  return (
    <PhoneInput
      value={value ?? ""}
      onChange={(v) => void onSave(v)}
    />
  );
}
