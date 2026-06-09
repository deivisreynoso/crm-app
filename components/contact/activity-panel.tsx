"use client";

import { useViewerTimeZone } from "@/hooks/useViewerTimeZone";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import type { ActivityType } from "@/lib/constants/activity";
import type { ActivityFeedItem, Note } from "@/types";
import { ActivityTimeline } from "@/components/contact/activity-timeline";

interface ActivityPanelProps {
  items?: ActivityFeedItem[];
  notes?: Note[];
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

export function ActivityPanel({
  items: itemsProp,
  notes,
  isLoading,
  timelineOnly = false,
}: ActivityPanelProps) {
  const { dict, locale } = useCrmLocale();
  const a = dict.activity;
  const items = itemsProp ?? (notes ? notesToFeedItems(notes) : []);
  const displayTz = useViewerTimeZone();

  const timelineLabels = {
    authorSystem: a.authorSystem,
    authorTeam: a.authorTeam,
    copy: a.copy,
    copied: a.copied,
    copyFailed: a.copyFailed,
    expand: a.expand,
    collapse: a.collapse,
    emailReceived: a.emailReceived,
    emailSent: a.emailSent,
    types: a.types as Record<string, string>,
    system: a.system as Record<string, string>,
  };

  if (isLoading) {
    return (
      <p className="text-sm text-body-muted text-center py-8">{a.loading}</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-body-muted text-center py-8">{a.empty}</p>
    );
  }

  return (
    <ActivityTimeline
      items={items}
      labels={timelineLabels}
      displayTz={displayTz}
      locale={locale}
    />
  );
}
