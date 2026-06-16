"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/calendar/location-input";
import { ContactSearchCombobox } from "@/components/forms/contact-search-combobox";
import { ContactMultiSelect } from "@/components/forms/contact-multi-select";
import { UserMultiSelect } from "@/components/forms/user-multi-select";
import { useOpportunityPicker } from "@/hooks/useOpportunities";
import { useWorkspace } from "@/components/crm/workspace-provider";
import type { CalendarEvent, CalendarEventFormInput } from "@/types";
import { formatApiError } from "@/lib/validation-errors";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type TeamMember = { id: string; label: string; role?: string };

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  initialDate?: Date;
  initial?: CalendarEvent | null;
  defaultContactId?: string;
  onSubmit: (data: CalendarEventFormInput) => Promise<void>;
  isLoading?: boolean;
}

export function CreateEventModal({
  open,
  onClose,
  initialDate,
  initial,
  defaultContactId,
  onSubmit,
  isLoading,
}: CreateEventModalProps) {
  const { ctx } = useWorkspace();
  const canPickAssignee = ctx?.canManage ?? false;
  const actorId = ctx?.actorUserId ?? "";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [additionalUsers, setAdditionalUsers] = useState<string[]>([]);
  const [additionalContacts, setAdditionalContacts] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isVirtual, setIsVirtual] = useState(true);
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: opportunities = [] } = useOpportunityPicker(
    contactId || undefined
  );

  useEffect(() => {
    if (!open) return;
    void axios
      .get<{ data: TeamMember[] }>("/api/team/members")
      .then((res) => setMembers(res.data.data ?? []))
      .catch(() => setMembers([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setContactId(initial.contact_id ?? "");
      setOpportunityId(initial.opportunity_id ?? "");
      setAssignedTo(initial.assigned_to ?? "");
      setAdditionalUsers(
        initial.attendees
          ?.filter((a) => a.attendee_type === "user" && a.user_id)
          .map((a) => a.user_id as string) ?? []
      );
      setAdditionalContacts(
        initial.attendees
          ?.filter((a) => a.attendee_type === "contact" && a.contact_id)
          .map((a) => a.contact_id as string) ?? []
      );
      setStart(toLocalInput(initial.start_time));
      setEnd(toLocalInput(initial.end_time));
      setIsVirtual(initial.location_type === "google_meet");
      setLocation(initial.location ?? "");
      return;
    }
    const base = initialDate ?? new Date();
    const startDt = new Date(base);
    startDt.setHours(9, 0, 0, 0);
    const endDt = new Date(startDt);
    endDt.setHours(10, 0, 0, 0);
    setTitle("");
    setDescription("");
    setContactId(defaultContactId ?? "");
    setOpportunityId("");
    setAssignedTo("");
    setAdditionalUsers([]);
    setAdditionalContacts([]);
    setStart(toLocalInput(startDt.toISOString()));
    setEnd(toLocalInput(endDt.toISOString()));
    setIsVirtual(true);
    setLocation("");
  }, [open, initial, initialDate, defaultContactId]);

  useEffect(() => {
    if (!open || initial) return;
    if (actorId) {
      setAssignedTo((prev) => prev || actorId);
    }
  }, [open, initial, actorId]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Enter a title for this meeting.";
    if (!start) next.start = "Choose a start date and time.";
    if (!end) next.end = "Choose an end date and time.";
    if (start && end && new Date(end) <= new Date(start)) {
      next.end = "End time must be after start time.";
    }
    if (!contactId) {
      next.link = "Select a contact for this event.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    try {
      await onSubmit({
        title: title.trim(),
        description: description || undefined,
        contact_id: contactId,
        opportunity_id: opportunityId || undefined,
        assigned_to: assignedTo || actorId || undefined,
        additional_users: additionalUsers.length ? additionalUsers : undefined,
        additional_contacts: additionalContacts.length ? additionalContacts : undefined,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        location: isVirtual ? undefined : location || undefined,
        location_type: isVirtual ? "google_meet" : "physical",
      });
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Could not save event"));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit event" : "Schedule meeting"}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {fieldErrors.link && (
          <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
            {fieldErrors.link}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Title</label>
          <input
            className="input-field w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!!fieldErrors.title}
          />
          {fieldErrors.title && (
            <p className="text-sm text-[var(--error)] mt-1">{fieldErrors.title}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Start</label>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            {fieldErrors.start && (
              <p className="text-sm text-[var(--error)] mt-1">{fieldErrors.start}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1">End</label>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            {fieldErrors.end && (
              <p className="text-sm text-[var(--error)] mt-1">{fieldErrors.end}</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Owner</label>
          {canPickAssignee ? (
            <select
              className="input-field w-full"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-body-muted">
              {members.find((m) => m.id === assignedTo)?.label ?? "You"}
            </p>
          )}
        </div>
        <ContactSearchCombobox
          value={contactId}
          onChange={(id) => {
            setContactId(id);
            setOpportunityId("");
            setAdditionalContacts((prev) => prev.filter((x) => x !== id));
          }}
          required
          error={fieldErrors.link}
        />
        <UserMultiSelect
          label="Additional team members (optional)"
          selectedIds={additionalUsers}
          excludeId={assignedTo || actorId}
          onChange={setAdditionalUsers}
        />
        <ContactMultiSelect
          label="Additional contacts (optional)"
          selectedIds={additionalContacts}
          excludeId={contactId}
          onChange={setAdditionalContacts}
        />
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            Opportunity <span className="text-body-muted font-normal">(optional)</span>
          </label>
          <select
            className="input-field w-full"
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
          >
            <option value="">— None —</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>
        <LocationInput
          isVirtual={isVirtual}
          location={location}
          onVirtualChange={setIsVirtual}
          onLocationChange={setLocation}
        />
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Notes</label>
          <textarea
            className="input-field w-full min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {initial ? "Update" : "Create"} event
          </Button>
        </div>
      </form>
    </Modal>
  );
}
