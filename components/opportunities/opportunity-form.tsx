"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { TagsInput } from "@/components/forms/tags-input";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import type { OpportunityFormInput, PipelineStage } from "@/types";

interface OpportunityFormProps {
  pipelineId: string;
  stages: PipelineStage[];
  defaultStage?: string;
  defaultContactId?: string;
  defaultCompanyId?: string;
  initial?: Partial<OpportunityFormInput> & { id?: string };
  onSubmit: (data: OpportunityFormInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OpportunityForm({
  pipelineId,
  stages,
  defaultStage,
  defaultContactId,
  defaultCompanyId,
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: OpportunityFormProps) {
  const { data: contactsData } = useContacts(1, 200);
  const { data: companies = [] } = useCompanies();
  const allContacts = contactsData?.data ?? [];

  const [companyId, setCompanyId] = useState(
    initial?.company_id ?? defaultCompanyId ?? ""
  );
  const [contactId, setContactId] = useState(
    initial?.contact_id ?? defaultContactId ?? ""
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [value, setValue] = useState(initial?.value?.toString() ?? "");
  const [stage, setStage] = useState(
    initial?.stage ?? defaultStage ?? stages[0]?.id ?? ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [probability, setProbability] = useState(
    initial?.probability?.toString() ?? "50"
  );

  const contacts = useMemo(() => {
    if (!companyId) return allContacts;
    return allContacts.filter((c) => c.company_id === companyId);
  }, [allContacts, companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !title.trim() || !stage) return;

    await onSubmit({
      contact_id: contactId,
      company_id: companyId || undefined,
      pipeline_id: pipelineId,
      title: title.trim(),
      value: value ? Number(value) : undefined,
      currency: "USD",
      stage,
      probability: Number(probability) || 50,
      notes: notes || undefined,
      tags: tags || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FormLabel>Account</FormLabel>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setContactId("");
            }}
            className="input-field"
          >
            <option value="">— Any account —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel required>Contact</FormLabel>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            required
            className="input-field"
          >
            <option value="">Select contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <FormLabel required>Deal name</FormLabel>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="input-field"
          placeholder="e.g. Annual contract renewal"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Value (USD)</FormLabel>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input-field"
            placeholder="0"
          />
        </div>
        <div>
          <FormLabel>Probability %</FormLabel>
          <input
            type="number"
            min="0"
            max="100"
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <FormLabel required>Stage</FormLabel>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          required
          className="input-field"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FormLabel>Tags</FormLabel>
        <TagsInput value={tags} onChange={setTags} />
      </div>

      <div>
        <FormLabel>Notes</FormLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input-field"
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
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
