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
        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
      <p className="text-xs text-slate-500 mt-1">Separate tags with commas</p>
    </div>
  );
}
