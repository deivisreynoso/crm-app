"use client";

import { cn } from "@/lib/utils";
import { formatDateTimeInTimeZone } from "@/lib/utils/datetime";
import { useDisplayTimeZone } from "@/hooks/useDisplayTimeZone";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import {
  ACTIVITY_TYPE_STYLES,
  type ActivityType,
} from "@/lib/constants/activity";
import type { ActivityFeedItem, Note } from "@/types";

interface ActivityPanelProps {
  items?: ActivityFeedItem[];
  notes?: Note[];
  contactTimezone?: string | null;
  isLoading?: boolean;
  isAdding?: boolean;
  onAdd?: (input: { content: string; activity_type: ActivityType }) => Promise<void>;
  /** Timeline-only mode (no inline log form) */
  timelineOnly?: boolean;
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

const APPOINTMENT_TYPE_STYLE =
  "bg-rose-50 text-rose-800 border border-rose-200";

export function ActivityPanel({
  items: itemsProp,
  notes,
  contactTimezone,
  isLoading,
  timelineOnly = false,
}: ActivityPanelProps) {
  const { dict } = useCrmLocale();
  const a = dict.activity;
  const items = itemsProp ?? (notes ? notesToFeedItems(notes) : []);
  const displayTz = useDisplayTimeZone(contactTimezone);

  function typeLabel(item: ActivityFeedItem) {
    if (item.type === "appointment") return a.types.appointment;
    if (item.is_system) {
      const sys = a.system as Record<string, string>;
      return sys[item.type] ?? a.system.activity;
    }
    const types = a.types as Record<string, string>;
    return types[item.type] ?? item.type;
  }

  function typeStyle(item: ActivityFeedItem) {
    if (item.type === "appointment") return APPOINTMENT_TYPE_STYLE;
    if (item.is_system) {
      return "bg-slate-100 text-slate-700 border border-slate-200";
    }
    return (
      ACTIVITY_TYPE_STYLES[item.type as ActivityType] ??
      "bg-slate-100 text-slate-700"
    );
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-body-muted text-center py-8">{a.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-body-muted text-center py-8">{a.empty}</p>
      ) : (
        <ul className="space-y-0">
          {items.map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pb-5">
              {index < items.length - 1 && (
                <span className="absolute left-[10px] top-5 bottom-0 w-px bg-[var(--card-border)]" />
              )}
              <span
                className={cn(
                  "relative z-10 w-5 h-5 rounded-full shrink-0 mt-0.5 border-2",
                  item.type === "appointment"
                    ? "bg-rose-100 border-rose-500"
                    : item.is_system
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
                  <time className="text-xs text-body-muted" title={displayTz}>
                    {formatDateTimeInTimeZone(item.created_at, displayTz)}
                  </time>
                </div>
                {item.type === "email" && item.email_body ? (
                  <div className="text-sm text-heading space-y-1">
                    {item.email_subject && (
                      <p className="font-medium">{item.email_subject}</p>
                    )}
                    <p className="text-body-muted text-xs">
                      {item.email_direction === "inbound"
                        ? a.emailReceived
                        : item.email_direction === "outbound"
                          ? a.emailSent
                          : a.types.email}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{item.email_body}</p>
                  </div>
                ) : (
                  <p className="text-sm text-heading whitespace-pre-wrap leading-relaxed">
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
