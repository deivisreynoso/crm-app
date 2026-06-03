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
import { useCustomFields } from "@/hooks/useCustomFields";
import {
  EntityCustomFieldsForm,
  type CustomFieldValues,
} from "@/components/custom-fields/entity-custom-fields-form";
import {
  normalizeCustomFieldValues,
  pruneCustomFieldValues,
} from "@/lib/custom-fields/normalize";
import { TagsChips } from "@/components/forms/tags-chips";
import type { CustomFieldDefinition, TicketFormInput } from "@/types";

const EMPTY_CUSTOM_FIELDS: CustomFieldDefinition[] = [];

interface TicketFormProps {
  initial?: Partial<TicketFormInput> & { id?: string };
  defaultContactId?: string;
  onSubmit: (data: TicketFormInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TicketForm({
  initial,
  defaultContactId,
  onSubmit,
  onCancel,
  isLoading,
}: TicketFormProps) {
  const { data: session } = useSession();
  const { data: contactsData } = useContacts(1, 200);
  const contacts = contactsData?.data ?? [];

  const [contactId, setContactId] = useState(
    initial?.contact_id ?? defaultContactId ?? ""
  );
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to ?? "");
  const [subject, setSubject] = useState(
    initial?.subject ?? initial?.title ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "open");
  const [priority, setPriority] = useState(initial?.priority ?? "medium");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState<string[]>(
    Array.isArray(initial?.tags)
      ? (initial.tags as string[])
      : typeof initial?.tags === "string" && initial.tags
        ? initial.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : []
  );
  const [customFields, setCustomFields] = useState<CustomFieldValues>({});

  const { data: customFieldDefsData, isLoading: customFieldsLoading } =
    useCustomFields("ticket");
  const customFieldDefs = customFieldDefsData ?? EMPTY_CUSTOM_FIELDS;

  useEffect(() => {
    const raw = normalizeCustomFieldValues(initial?.custom_fields);
    setCustomFields(pruneCustomFieldValues(raw, customFieldDefs));
    if (initial?.contact_id !== undefined) {
      setContactId(initial.contact_id ?? defaultContactId ?? "");
    }
    if (initial?.subject !== undefined || initial?.title !== undefined) {
      setSubject(initial.subject ?? initial.title ?? "");
    }
    if (initial?.description !== undefined) setDescription(initial.description ?? "");
    if (initial?.status !== undefined) setStatus(initial.status);
    if (initial?.priority !== undefined) setPriority(initial.priority);
    if (initial?.category !== undefined) setCategory(initial.category ?? "");
    if (initial?.tags !== undefined) {
      setTags(
        Array.isArray(initial.tags)
          ? initial.tags
          : typeof initial.tags === "string"
            ? initial.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : []
      );
    }
  }, [initial?.id, initial, defaultContactId, customFieldDefs]);

  const sessionUser = session?.user as { id?: string; name?: string | null; email?: string | null } | undefined;
  const assigneeId = sessionUser?.id ?? "";
  const assigneeLabel = sessionUser?.name ?? sessionUser?.email ?? "Current user";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !contactId) return;

    await onSubmit({
      contact_id: contactId,
      assigned_to: assignedTo || assigneeId || undefined,
      subject: subject.trim(),
      description: description || undefined,
      status,
      priority,
      category: category || undefined,
      tags: tags.join(", "),
      custom_fields: pruneCustomFieldValues(customFields, customFieldDefs),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FormLabel required>Contact</FormLabel>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          required
          className="input-field"
        >
          <option value="">— Select contact —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
              {c.company?.trim() ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
      </div>
      <RequiredHint>Every service ticket must be linked to a contact.</RequiredHint>

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

      <div>
        <FormLabel>Tags</FormLabel>
        <TagsChips tags={tags} onChange={setTags} />
      </div>

      <EntityCustomFieldsForm
        fields={customFieldDefs}
        isLoading={customFieldsLoading}
        values={customFields}
        onChange={(next) =>
          setCustomFields(pruneCustomFieldValues(next, customFieldDefs))
        }
      />

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !contactId}>
          {isLoading ? "Saving…" : initial?.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
