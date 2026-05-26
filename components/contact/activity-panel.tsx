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
import type { ActivityFeedItem, Note } from "@/types";

interface ActivityPanelProps {
  items?: ActivityFeedItem[];
  notes?: Note[];
  isLoading?: boolean;
  isAdding: boolean;
  onAdd?: (input: { content: string; activity_type: ActivityType }) => Promise<void>;
}

function notesToFeedItems(notes: Note[]): ActivityFeedItem[] {
  return notes.map((n) => ({
    id: `note-${n.id}`,
    source: "note" as const,
    type: n.activity_type ?? "note",
    content: n.content,
    created_at: n.created_at,
    is_system: false,
  }));
}

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  system: "System",
  update: "Updated",
  created: "Created",
  task: "Task",
};

export function ActivityPanel({
  items: itemsProp,
  notes,
  isLoading,
  isAdding,
  onAdd,
}: ActivityPanelProps) {
  const items = itemsProp ?? (notes ? notesToFeedItems(notes) : []);
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [content, setContent] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onAdd || !content.trim()) return;
    await onAdd({ content: content.trim(), activity_type: activityType });
    setContent("");
  }

  function typeLabel(item: ActivityFeedItem) {
    if (item.is_system) {
      return SYSTEM_TYPE_LABELS[item.type] ?? "Activity";
    }
    return ACTIVITY_TYPE_LABELS[item.type as ActivityType] ?? item.type;
  }

  function typeStyle(item: ActivityFeedItem) {
    if (item.is_system) {
      return "bg-slate-100 text-slate-700 border border-slate-200";
    }
    return (
      ACTIVITY_TYPE_STYLES[item.type as ActivityType] ??
      "bg-slate-100 text-slate-700"
    );
  }

  return (
    <div className="space-y-6">
      {onAdd && (
      <form
        onSubmit={handleSubmit}
        className="space-y-3 p-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]"
      >
        <p className="text-xs text-body-muted">
          Log a manual activity below. Updates, tasks, and other actions on this
          contact appear automatically in the timeline.
        </p>
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
                  : "bg-[var(--card)] text-body-muted border border-[var(--card-border)] hover:border-[var(--primary)]"
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
          className="input-field w-full min-h-[80px]"
        />
        <Button type="submit" size="sm" disabled={isAdding}>
          Log activity
        </Button>
      </form>
      )}

      {isLoading ? (
        <p className="text-sm text-body-muted text-center py-8">Loading activity…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-body-muted text-center py-8">
          No activity yet. Actions on this contact will show up here automatically.
        </p>
      ) : (
        <ul className="space-y-0">
          {items.map((item, index) => (
            <li key={item.id} className="relative flex gap-4 pb-6">
              {index < items.length - 1 && (
                <span className="absolute left-[11px] top-6 bottom-0 w-px bg-[var(--card-border)]" />
              )}
              <span
                className={cn(
                  "relative z-10 w-6 h-6 rounded-full shrink-0 mt-0.5 border-2",
                  item.is_system
                    ? "bg-[var(--surface-subtle)] border-[var(--card-border)]"
                    : "bg-[var(--card)] border-[var(--primary)]"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      typeStyle(item)
                    )}
                  >
                    {typeLabel(item)}
                  </span>
                  <time className="text-xs text-body-muted">
                    {formatDateTime(item.created_at)}
                  </time>
                </div>
                {item.type === "email" && item.email_body ? (
                  <div className="text-sm text-heading space-y-1">
                    {item.email_subject && (
                      <p className="font-medium">{item.email_subject}</p>
                    )}
                    <p className="text-body-muted text-xs">
                      {item.email_direction === "inbound"
                        ? "Received"
                        : item.email_direction === "outbound"
                          ? "Sent"
                          : "Email"}
                    </p>
                    <p className="whitespace-pre-wrap">{item.email_body}</p>
                  </div>
                ) : (
                  <p className="text-sm text-heading whitespace-pre-wrap">
                    {item.content}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
