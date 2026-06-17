"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useState } from "react";
import {
  calendarEventColor,
  formatEventRange,
  isAppointmentEvent,
  isUrlLocation,
} from "@/lib/calendar/utils";
import { useViewerTimeZone } from "@/hooks/useViewerTimeZone";
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
  const timeZone = useViewerTimeZone();

  if (!event) return null;

  const appointment = isAppointmentEvent(event);
  const extraUsers =
    event.attendees?.filter((a) => a.attendee_type === "user") ?? [];
  const extraContacts =
    event.attendees?.filter((a) => a.attendee_type === "contact") ?? [];

  return (
    <>
      <Modal open={!!event} onClose={onClose} title={event.title}>
        <div className="space-y-4 text-sm">
          <p className="flex items-center gap-2 text-body-muted">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: calendarEventColor(event) }}
            />
            {appointment ? "Website appointment" : "Meeting"}
            {" · "}
            {formatEventRange(event.start_time, event.end_time, timeZone)}
          </p>
          {event.owner_name && !appointment && (
            <p>
              <span className="text-body-muted">Organizer: </span>
              <span className="text-heading font-medium">{event.owner_name}</span>
            </p>
          )}
          {extraUsers.length > 0 && (
            <p>
              <span className="text-body-muted">Additional team: </span>
              <span className="text-heading">
                {extraUsers.map((a) => a.display_name ?? "Member").join(", ")}
              </span>
            </p>
          )}
          {contactName && (
            <p>
              <span className="text-body-muted">Primary contact: </span>
              <span className="text-heading font-medium">{contactName}</span>
            </p>
          )}
          {extraContacts.length > 0 && (
            <p>
              <span className="text-body-muted">Additional contacts: </span>
              <span className="text-heading">
                {extraContacts
                  .map((a) => a.display_name ?? a.email ?? "Contact")
                  .join(", ")}
              </span>
            </p>
          )}
          {event.location_type === "google_meet" && event.location && (
            <p>
              <span className="text-body-muted">Google Meet: </span>
              {isUrlLocation(event.location) ? (
                <a
                  href={event.location}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--primary)] hover:underline break-all"
                >
                  Join meeting
                </a>
              ) : (
                <span className="text-heading">{event.location}</span>
              )}
            </p>
          )}
          {event.location_type !== "google_meet" && event.location && (
            <p>
              <span className="text-body-muted">Location: </span>
              <span className="text-heading">{event.location}</span>
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
