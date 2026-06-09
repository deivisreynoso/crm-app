"use client";

import { useState } from "react";
import { useViewerTimeZone } from "@/hooks/useViewerTimeZone";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import {
  useDeleteContactNote,
  useUpdateContactNote,
} from "@/hooks/useContacts";
import type { ActivityFeedItem, Note } from "@/types";
import { ActivityTimeline } from "@/components/contact/activity-timeline";
import {
  EditNoteModal,
  getNoteIdFromFeedItem,
} from "@/components/contact/edit-note-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ActivityPanelProps {
  contactId?: string;
  items?: ActivityFeedItem[];
  notes?: Note[];
  isLoading?: boolean;
  canWrite?: boolean;
  /** Timeline-only mode (no inline log form) */
  timelineOnly?: boolean;
}

function notesToFeedItems(notes: Note[]): ActivityFeedItem[] {
  return notes.map((n) => ({
    id: `note-${n.id}`,
    source: "note" as const,
    source_id: n.id,
    type: n.activity_type ?? "note",
    content: n.content,
    created_at: n.created_at,
    is_system: false,
  }));
}

export function ActivityPanel({
  contactId,
  items: itemsProp,
  notes,
  isLoading,
  canWrite = false,
  timelineOnly = false,
}: ActivityPanelProps) {
  const { dict, locale } = useCrmLocale();
  const a = dict.activity;
  const act = dict.actions;
  const items = itemsProp ?? (notes ? notesToFeedItems(notes) : []);
  const displayTz = useViewerTimeZone();
  const updateNote = useUpdateContactNote(contactId ?? "");
  const deleteNote = useDeleteContactNote(contactId ?? "");
  const [editItem, setEditItem] = useState<ActivityFeedItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ActivityFeedItem | null>(null);
  const canManageNotes = canWrite && !!contactId;

  const timelineLabels = {
    authorSystem: a.authorSystem,
    authorTeam: a.authorTeam,
    copy: a.copy,
    copied: a.copied,
    copyFailed: a.copyFailed,
    expand: a.expand,
    collapse: a.collapse,
    edit: act.edit,
    delete: act.delete,
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
    <>
      <ActivityTimeline
        items={items}
        labels={timelineLabels}
        displayTz={displayTz}
        locale={locale}
        canWrite={canManageNotes}
        onEdit={canManageNotes ? setEditItem : undefined}
        onDelete={canManageNotes ? setDeleteItem : undefined}
      />

      {canManageNotes && (
        <>
          <EditNoteModal
            item={editItem}
            open={!!editItem}
            onClose={() => setEditItem(null)}
            saving={updateNote.isPending}
            onSave={async (input) => {
              await updateNote.mutateAsync(input);
            }}
          />

          <ConfirmDialog
            open={!!deleteItem}
            title={a.deleteTitle}
            description={a.deleteDescription}
            confirmLabel={act.delete}
            cancelLabel={act.cancel}
            destructive
            loading={deleteNote.isPending}
            onCancel={() => setDeleteItem(null)}
            onConfirm={async () => {
              if (!deleteItem) return;
              const noteId = getNoteIdFromFeedItem(deleteItem);
              if (!noteId) return;
              await deleteNote.mutateAsync(noteId);
              setDeleteItem(null);
            }}
          />
        </>
      )}
    </>
  );
}
