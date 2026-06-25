"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";
import {
  ACTIVITY_TYPE_STYLES,
  type ActivityType,
} from "@/lib/constants/activity";
import type { ActivityFeedItem } from "@/types";

const EDITABLE_TYPES = ["call", "note"] as const satisfies readonly ActivityType[];

interface EditNoteModalProps {
  item: ActivityFeedItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (input: {
    noteId: string;
    content: string;
    activity_type: ActivityType;
  }) => Promise<void>;
  saving?: boolean;
}

export function getNoteIdFromFeedItem(item: ActivityFeedItem): string | null {
  if (item.source !== "note") return null;
  if (item.source_id) return item.source_id;
  const prefix = "note-";
  return item.id.startsWith(prefix) ? item.id.slice(prefix.length) : null;
}

export function isEditableFeedItem(item: ActivityFeedItem): boolean {
  return item.source === "note" && !item.is_system;
}

export function EditNoteModal({
  item,
  open,
  onClose,
  onSave,
  saving = false,
}: EditNoteModalProps) {
  const { dict } = useCrmLocale();
  const a = dict.activity;
  const act = dict.actions;
  const [content, setContent] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent(item.content);
    setActivityType(
      (EDITABLE_TYPES.includes(item.type as (typeof EDITABLE_TYPES)[number])
        ? item.type
        : "note") as ActivityType
    );
    setError(null);
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const noteId = getNoteIdFromFeedItem(item);
    if (!noteId || !content.trim()) return;
    setError(null);
    try {
      await onSave({
        noteId,
        content: content.trim(),
        activity_type: activityType,
      });
      onClose();
    } catch (err) {
      setError(formatApiError(err, a.saveFailed));
    }
  }

  if (!item) return null;

  const title =
    activityType === "call" ? a.editCallTitle : a.editNoteTitle;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {EDITABLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActivityType(type)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                activityType === type
                  ? ACTIVITY_TYPE_STYLES[type]
                  : "bg-[var(--card)] text-body-muted border-[var(--card-border)] hover:border-[var(--primary)]/40"
              )}
            >
              {type === "call" ? a.logCall : a.logNote}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="input-field w-full min-h-[120px] text-sm"
          placeholder={
            activityType === "call" ? a.placeholderCall : a.placeholderNote
          }
          autoFocus
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {act.cancel}
          </Button>
          <Button type="submit" disabled={saving || !content.trim()}>
            {saving ? a.saving : act.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
