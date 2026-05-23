"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel, RequiredHint } from "@/components/ui/form-label";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/lib/constants/ticket-fields";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useCustomFields } from "@/hooks/useCustomFields";
import {
  EntityCustomFieldsForm,
  type CustomFieldValues,
} from "@/components/custom-fields/entity-custom-fields-form";
import { normalizeCustomFieldValues } from "@/lib/custom-fields/normalize";
import type { TicketFormInput } from "@/types";

interface TicketFormProps {
  initial?: Partial<TicketFormInput> & { id?: string };
  defaultContactId?: string;
  defaultCompanyId?: string;
  onSubmit: (data: TicketFormInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TicketForm({
  initial,
  defaultContactId,
  defaultCompanyId,
  onSubmit,
  onCancel,
  isLoading,
}: TicketFormProps) {
  const { data: session } = useSession();
  const { data: contactsData } = useContacts(1, 200);
  const { data: companies = [] } = useCompanies();
  const contacts = contactsData?.data ?? [];

  const [contactId, setContactId] = useState(
    initial?.contact_id ?? defaultContactId ?? ""
  );
  const [companyId, setCompanyId] = useState(
    initial?.company_id ?? defaultCompanyId ?? ""
  );
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to ?? "");
  const [subject, setSubject] = useState(
    initial?.subject ?? initial?.title ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "open");
  const [priority, setPriority] = useState(initial?.priority ?? "medium");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [customFields, setCustomFields] = useState<CustomFieldValues>(
    (initial?.custom_fields as CustomFieldValues) ?? {}
  );

  const { data: customFieldDefs = [], isLoading: customFieldsLoading } =
    useCustomFields("ticket");

  useEffect(() => {
    setCustomFields(normalizeCustomFieldValues(initial?.custom_fields));
    if (initial?.contact_id !== undefined) {
      setContactId(initial.contact_id ?? defaultContactId ?? "");
    }
    if (initial?.company_id !== undefined) {
      setCompanyId(initial.company_id ?? defaultCompanyId ?? "");
    }
    if (initial?.subject !== undefined || initial?.title !== undefined) {
      setSubject(initial.subject ?? initial.title ?? "");
    }
    if (initial?.description !== undefined) setDescription(initial.description ?? "");
    if (initial?.status !== undefined) setStatus(initial.status);
    if (initial?.priority !== undefined) setPriority(initial.priority);
    if (initial?.category !== undefined) setCategory(initial.category ?? "");
  }, [initial?.id, initial, defaultContactId, defaultCompanyId]);

  const sessionUser = session?.user as { id?: string; name?: string | null; email?: string | null } | undefined;
  const assigneeId = sessionUser?.id ?? "";
  const assigneeLabel = sessionUser?.name ?? sessionUser?.email ?? "Current user";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    if (!contactId && !companyId) return;

    await onSubmit({
      contact_id: contactId || undefined,
      company_id: companyId || undefined,
      assigned_to: assignedTo || assigneeId || undefined,
      subject: subject.trim(),
      description: description || undefined,
      status,
      priority,
      category: category || undefined,
      custom_fields: customFields,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FormLabel>Account</FormLabel>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="input-field"
          >
            <option value="">— Select account —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel>Contact</FormLabel>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="input-field"
          >
            <option value="">— Select contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <RequiredHint>Link to an account and/or contact (at least one required)</RequiredHint>

      <div>
        <FormLabel>Assigned to</FormLabel>
        <select
          value={assignedTo || assigneeId}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="input-field"
        >
          <option value="">Unassigned</option>
          {assigneeId && (
            <option value={assigneeId}>
              {assigneeLabel} (me)
            </option>
          )}
        </select>
      </div>

      <div>
        <FormLabel required>Subject</FormLabel>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="input-field"
          placeholder="Why is the customer requesting support?"
        />
      </div>

      <div>
        <FormLabel>Description</FormLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="input-field"
          placeholder="Additional details"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <FormLabel>Status</FormLabel>
          <select
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as "open" | "in_progress" | "closed" | "on_hold"
              )
            }
            className="input-field"
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel>Priority</FormLabel>
          <select
            value={priority}
            onChange={(e) =>
              setPriority(
                e.target.value as "low" | "medium" | "high" | "urgent"
              )
            }
            className="input-field"
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel>Category</FormLabel>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
          >
            <option value="">— Select category —</option>
            {TICKET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <EntityCustomFieldsForm
        fields={customFieldDefs}
        isLoading={customFieldsLoading}
        values={customFields}
        onChange={setCustomFields}
      />

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving…" : initial?.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
