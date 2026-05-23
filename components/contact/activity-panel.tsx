"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_STYLES,
  type ActivityType,
} from "@/lib/constants/activity";
import type { Note } from "@/types";

interface ActivityPanelProps {
  notes: Note[];
  isAdding: boolean;
  onAdd: (input: { content: string; activity_type: ActivityType }) => Promise<void>;
}

export function ActivityPanel({ notes, isAdding, onAdd }: ActivityPanelProps) {
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [content, setContent] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await onAdd({ content: content.trim(), activity_type: activityType });
    setContent("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActivityType(type)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activityType === type
                  ? ACTIVITY_TYPE_STYLES[type]
                  : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
              )}
            >
              {ACTIVITY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={`What happened on this ${ACTIVITY_TYPE_LABELS[activityType].toLowerCase()}?`}
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
        />
        <Button type="submit" size="sm" disabled={isAdding}>
          Log activity
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          No activity logged yet. Record a call, email, or meeting above.
        </p>
      ) : (
        <ul className="space-y-0">
          {notes.map((note, index) => (
            <li key={note.id} className="relative flex gap-4 pb-6">
              {index < notes.length - 1 && (
                <span className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200" />
              )}
              <span className="relative z-10 w-6 h-6 rounded-full bg-white border-2 border-slate-300 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      ACTIVITY_TYPE_STYLES[note.activity_type ?? "note"]
                    )}
                  >
                    {ACTIVITY_TYPE_LABELS[note.activity_type ?? "note"]}
                  </span>
                  <time className="text-xs text-slate-500">
                    {formatDateTime(note.created_at)}
                  </time>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
