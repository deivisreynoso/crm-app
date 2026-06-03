"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { TagsInput } from "@/components/forms/tags-input";
import { useContacts } from "@/hooks/useContacts";
import { useCustomFields } from "@/hooks/useCustomFields";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import axios from "axios";
import { normalizeCustomFieldValues } from "@/lib/custom-fields/normalize";
import {
  EntityCustomFieldsForm,
  type CustomFieldValues,
} from "@/components/custom-fields/entity-custom-fields-form";
import type { OpportunityFormInput, PipelineStage } from "@/types";

interface OpportunityFormProps {
  pipelineId: string;
  stages: PipelineStage[];
  defaultStage?: string;
  defaultContactId?: string;
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
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: OpportunityFormProps) {
  const { data: contactsData } = useContacts(1, 200);
  const allContacts = contactsData?.data ?? [];

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
  const [ownerId, setOwnerId] = useState(initial?.owner_id ?? "");
  const [teamMembers, setTeamMembers] = useState<
    { id: string; label: string }[]
  >([]);
  const [probability, setProbability] = useState(
    initial?.probability?.toString() ?? "50"
  );
  const [customFields, setCustomFields] = useState<CustomFieldValues>(
    (initial?.custom_fields as CustomFieldValues) ?? {}
  );

  const { data: customFieldDefs = [], isLoading: customFieldsLoading } =
    useCustomFields("opportunity");
  const { data: workspaceSettings } = useWorkspaceSettings();
  const defaultCurrency = workspaceSettings?.default_currency ?? "USD";

  useEffect(() => {
    void axios
      .get<{ data: { id: string; label: string }[] }>("/api/team/members")
      .then((res) => {
        setTeamMembers(res.data.data ?? []);
      });
  }, []);

  useEffect(() => {
    setCustomFields(normalizeCustomFieldValues(initial?.custom_fields));
    if (initial?.contact_id !== undefined) {
      setContactId(initial.contact_id ?? defaultContactId ?? "");
    }
    if (initial?.title !== undefined) setTitle(initial.title);
    if (initial?.value !== undefined) setValue(initial.value?.toString() ?? "");
    if (initial?.stage !== undefined) {
      setStage(initial.stage ?? defaultStage ?? stages[0]?.id ?? "");
    }
    if (initial?.notes !== undefined) setNotes(initial.notes ?? "");
    if (initial?.tags !== undefined) setTags(initial.tags ?? "");
    if (initial?.owner_id !== undefined) setOwnerId(initial.owner_id ?? "");
    if (initial?.probability !== undefined) {
      setProbability(initial.probability?.toString() ?? "50");
    }
  }, [initial?.id, initial, defaultContactId, defaultStage, stages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !title.trim() || !stage) return;

    await onSubmit({
      contact_id: contactId,
      pipeline_id: pipelineId,
      title: title.trim(),
      value: value ? Number(value) : undefined,
      currency: initial?.currency ?? defaultCurrency,
      stage,
      probability: Number(probability) || 50,
      notes: notes || undefined,
      tags: tags || undefined,
      owner_id: ownerId || undefined,
      custom_fields: customFields,
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
          <option value="">Select contact</option>
          {allContacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
              {c.company?.trim() ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
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
          <FormLabel>Value ({defaultCurrency})</FormLabel>
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

      {teamMembers.length > 0 && (
        <div>
          <FormLabel>Owner</FormLabel>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="input-field"
          >
            <option value="">— Default —</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

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

      <EntityCustomFieldsForm
        fields={customFieldDefs}
        isLoading={customFieldsLoading}
        values={customFields}
        onChange={setCustomFields}
      />

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
