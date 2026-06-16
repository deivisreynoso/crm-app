"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

type TeamMember = { id: string; label: string };

type Props = {
  label: string;
  selectedIds: string[];
  excludeId?: string;
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function UserMultiSelect({
  label,
  selectedIds,
  excludeId,
  onChange,
  disabled,
}: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    void axios
      .get<{ data: TeamMember[] }>("/api/team/members")
      .then((res) => setMembers(res.data.data ?? []))
      .catch(() => setMembers([]));
  }, []);

  const available = members.filter(
    (m) => m.id !== excludeId && !selectedIds.includes(m.id)
  );
  const selected = members.filter((m) => selectedIds.includes(m.id));

  return (
    <div>
      <label className="block text-sm font-medium text-heading mb-1">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-800"
            >
              {m.label}
              {!disabled && (
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-800"
                  onClick={() => onChange(selectedIds.filter((id) => id !== m.id))}
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <select
          className="input-field w-full"
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id) onChange([...selectedIds, id]);
          }}
        >
          <option value="">Add team member…</option>
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
