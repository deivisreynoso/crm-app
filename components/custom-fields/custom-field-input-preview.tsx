"use client";

import { useState } from "react";

interface PreviewField {
  field_name: string;
  field_type: string;
  placeholder?: string | null;
  options?: string[];
  is_required?: boolean;
}

export function CustomFieldInputPreview({ field }: { field: PreviewField }) {
  const [textVal, setTextVal] = useState("");
  const [selectVal, setSelectVal] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  const placeholderText = field.placeholder?.trim() || "";

  const label = (
    <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted block mb-1">
      {field.field_name}
      {field.is_required && (
        <span className="text-[var(--error)] ml-0.5" aria-hidden>
          *
        </span>
      )}
    </label>
  );

  if (field.field_type === "checkbox") {
    return (
      <div>
        {label}
        <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          {placeholderText || "Yes / enabled"}
        </label>
      </div>
    );
  }

  if (field.field_type === "multiselect") {
    const opts = field.options?.length ? field.options : ["Option A", "Option B"];
    return (
      <div>
        {label}
        <div className="space-y-2 rounded-lg border border-[var(--card-border)] p-3 bg-[var(--card)]">
          {opts.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-heading">
              <input
                type="checkbox"
                checked={multi.includes(opt)}
                onChange={(e) => {
                  setMulti((prev) =>
                    e.target.checked
                      ? [...prev, opt]
                      : prev.filter((x) => x !== opt)
                  );
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.field_type === "select") {
    const opts = field.options?.length ? field.options : ["Option A", "Option B"];
    return (
      <div>
        {label}
        <select
          className="input-field w-full"
          value={selectVal}
          onChange={(e) => setSelectVal(e.target.value)}
        >
          <option value="">{placeholderText || "Select…"}</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.field_type === "date") {
    return (
      <div>
        {label}
        <input type="date" className="input-field w-full" defaultValue="" />
      </div>
    );
  }

  const inputType =
    field.field_type === "number" || field.field_type === "currency"
      ? "number"
      : "text";

  return (
    <div>
      {label}
      <input
        type={inputType}
        className="input-field w-full"
        placeholder={placeholderText || "Type here…"}
        value={textVal}
        onChange={(e) => setTextVal(e.target.value)}
      />
    </div>
  );
}
