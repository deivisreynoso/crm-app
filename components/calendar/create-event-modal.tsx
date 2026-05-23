"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/calendar/location-input";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOpportunityPicker } from "@/hooks/useOpportunities";
import type { CalendarEvent, CalendarEventFormInput } from "@/types";
import type { LocationType } from "@/lib/calendar/utils";
import { formatApiError } from "@/lib/validation-errors";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  initialDate?: Date;
  initial?: CalendarEvent | null;
  onSubmit: (data: CalendarEventFormInput) => Promise<void>;
  isLoading?: boolean;
}

export function CreateEventModal({
  open,
  onClose,
  initialDate,
  initial,
  onSubmit,
  isLoading,
}: CreateEventModalProps) {
  const { data: contactsData } = useContacts(1, 200);
  const { data: companies = [] } = useCompanies();
  const contacts = contactsData?.data ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("zoom");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: opportunities = [] } = useOpportunityPicker(
    contactId || undefined
  );

  const filteredContacts = useMemo(() => {
    if (!companyId) return contacts;
    return contacts.filter((c) => c.company_id === companyId);
  }, [contacts, companyId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setCompanyId(initial.company_id ?? "");
      setContactId(initial.contact_id ?? "");
      setOpportunityId(initial.opportunity_id ?? "");
      setStart(toLocalInput(initial.start_time));
      setEnd(toLocalInput(initial.end_time));
      setLocationType((initial.location_type as LocationType) ?? "other");
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
    setCompanyId("");
    setContactId("");
    setOpportunityId("");
    setStart(toLocalInput(startDt.toISOString()));
    setEnd(toLocalInput(endDt.toISOString()));
    setLocationType("zoom");
    setLocation("");
  }, [open, initial, initialDate]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Enter a title for this meeting.";
    if (!start) next.start = "Choose a start date and time.";
    if (!end) next.end = "Choose an end date and time.";
    if (start && end && new Date(end) <= new Date(start)) {
      next.end = "End time must be after start time.";
    }
    if (!contactId && !companyId) {
      next.link = "Select an account or contact for this event.";
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
        company_id: companyId || undefined,
        contact_id: contactId || undefined,
        opportunity_id: opportunityId || undefined,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        location: location || undefined,
        location_type: locationType,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Account</label>
            <select
              className="input-field w-full"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setContactId("");
                setOpportunityId("");
              }}
            >
              <option value="">— Select account —</option>
              {companies.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Contact</label>
            <select
              className="input-field w-full"
              value={contactId}
              onChange={(e) => {
                setContactId(e.target.value);
                setOpportunityId("");
              }}
            >
              <option value="">— Select contact —</option>
              {filteredContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
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
          locationType={locationType}
          location={location}
          onTypeChange={(v) => setLocationType(v as LocationType)}
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
