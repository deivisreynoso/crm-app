"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TagsInput } from "@/components/forms/tags-input";
import { useContacts } from "@/hooks/useContacts";
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

const inputClassName =
  "w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900";

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
  const { data: contactsData } = useContacts(1, 100);
  const allContacts = contactsData?.data ?? [];
  const contacts = defaultCompanyId
    ? allContacts.filter((c) => c.company_id === defaultCompanyId)
    : allContacts;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !title.trim() || !stage) return;

    await onSubmit({
      contact_id: contactId,
      company_id: defaultCompanyId || undefined,
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
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Contact *
        </label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          required
          className={inputClassName}
        >
          <option value="">Select contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
              {c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Opportunity name *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClassName}
          placeholder="e.g. Campaña - Elizabeth"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Value (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClassName}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Probability %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Stage *
        </label>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          required
          className={inputClassName}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Tags
        </label>
        <TagsInput value={tags} onChange={setTags} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClassName}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initial?.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
