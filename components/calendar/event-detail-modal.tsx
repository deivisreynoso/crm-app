"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useState } from "react";
import {
  formatEventRange,
  isUrlLocation,
  locationColor,
  LOCATION_TYPES,
} from "@/lib/calendar/utils";
import type { CalendarEvent } from "@/types";

interface EventDetailModalProps {
  event: CalendarEvent | null;
  contactName?: string;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  deleteLoading?: boolean;
}

export function EventDetailModal({
  event,
  contactName,
  onClose,
  onEdit,
  onDelete,
  deleteLoading,
}: EventDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!event) return null;

  const locLabel = LOCATION_TYPES.find((t) => t.value === event.location_type)?.label;

  return (
    <>
      <Modal open={!!event} onClose={onClose} title={event.title}>
        <div className="space-y-4 text-sm">
          <p className="text-body-muted">{formatEventRange(event.start_time, event.end_time)}</p>
          {contactName && (
            <p>
              <span className="text-body-muted">Contact: </span>
              <span className="text-heading font-medium">{contactName}</span>
            </p>
          )}
          {event.location_type && (
            <p className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: locationColor(event.location_type) }}
              />
              <span className="text-body-muted">{locLabel}</span>
            </p>
          )}
          {event.location && (
            <p>
              {isUrlLocation(event.location) ? (
                <a
                  href={event.location}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--primary)] hover:underline break-all"
                >
                  {event.location}
                </a>
              ) : (
                <span className="text-heading">{event.location}</span>
              )}
            </p>
          )}
          {event.description && (
            <p className="whitespace-pre-wrap text-heading">{event.description}</p>
          )}
          {(onEdit || onDelete) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            )}
            {onDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-[var(--error)] border-red-200"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
            )}
          </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete event"
        description="Remove this meeting from your calendar?"
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={async () => {
          await onDelete?.();
          setConfirmDelete(false);
          onClose();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
