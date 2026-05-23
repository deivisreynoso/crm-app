"use client";

interface TagsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TagsInput({ value, onChange, placeholder }: TagsInputProps) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "e.g. whatsapp, hot-lead"}
        className="input-field w-full"
      />
      <p className="text-xs text-body-muted mt-1">Separate tags with commas</p>
    </div>
  );
}
