"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel, RequiredHint } from "@/components/ui/form-label";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
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
  const { data: contactsData } = useContacts(1, 200);
  const { data: companies = [] } = useCompanies();
  const contacts = contactsData?.data ?? [];

  const [contactId, setContactId] = useState(
    initial?.contact_id ?? defaultContactId ?? ""
  );
  const [companyId, setCompanyId] = useState(
    initial?.company_id ?? defaultCompanyId ?? ""
  );
  const [subject, setSubject] = useState(
    initial?.subject ?? initial?.title ?? ""
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "open");
  const [priority, setPriority] = useState(initial?.priority ?? "medium");
  const [category, setCategory] = useState(initial?.category ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    if (!contactId && !companyId) return;

    await onSubmit({
      contact_id: contactId || undefined,
      company_id: companyId || undefined,
      subject: subject.trim(),
      description: description || undefined,
      status,
      priority,
      category: category || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FormLabel>Account</FormLabel>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="input-field"
        >
          <option value="">— None —</option>
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
          <option value="">— None —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
        <RequiredHint>Link to an account and/or contact (at least one required)</RequiredHint>
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
      <div className="grid grid-cols-2 gap-3">
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
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="closed">Closed</option>
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
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div>
        <FormLabel>Category</FormLabel>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field"
          placeholder="e.g. Billing, Technical"
        />
      </div>
      <div>
        <FormLabel>Description</FormLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="input-field"
          placeholder="Additional details about the request"
        />
      </div>
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
