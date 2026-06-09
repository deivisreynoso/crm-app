"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useCreateEmailTemplate,
  useEmailTemplates,
  useUpdateEmailTemplate,
  type EmailTemplate,
} from "@/hooks/useEmailTemplates";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";
import { useState } from "react";

type TemplateContextContact = Pick<
  Contact,
  "first_name" | "last_name" | "email" | "phone" | "company" | "company_id"
>;

type Props = {
  contact?: TemplateContextContact;
  companyName?: string | null;
  templateId: string;
  onTemplateIdChange: (id: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  canManageTemplates?: boolean;
  allowReviewTemplate?: boolean;
  reviewTemplate?: EmailTemplate | null;
  reviewTemplateId?: string | null;
  onSaveReviewTemplate?: (input: {
    subject: string;
    body: string;
  }) => Promise<void>;
};

export function EmailTemplatePicker({
  contact,
  companyName,
  templateId,
  onTemplateIdChange,
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  canManageTemplates = false,
  allowReviewTemplate = false,
  reviewTemplate,
  reviewTemplateId,
  onSaveReviewTemplate,
}: Props) {
  const { data: templates = [] } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const templateContext = contact
    ? buildTemplateContext({
        contact,
        company: companyName ? { name: companyName } : null,
      })
    : null;

  const selected = templates.find((t) => t.id === templateId);

  function applyTemplate(template: EmailTemplate) {
    onTemplateIdChange(template.id);
    if (templateContext) {
      onSubjectChange(interpolateTemplate(template.subject, templateContext));
      onBodyChange(interpolateTemplate(template.body, templateContext));
    } else {
      onSubjectChange(template.subject);
      onBodyChange(template.body);
    }
    setEditing(false);
  }

  async function handleSaveTemplate() {
    setError(null);
    setSaving(true);
    try {
      if (allowReviewTemplate && onSaveReviewTemplate) {
        await onSaveReviewTemplate({ subject, body });
        setEditing(false);
        return;
      }

      if (selected) {
        await updateTemplate.mutateAsync({
          id: selected.id,
          input: {
            name: editName.trim() || selected.name,
            subject: subject.trim(),
            body,
          },
        });
      } else if (canManageTemplates && editName.trim()) {
        const { data } = await createTemplate.mutateAsync({
          name: editName.trim(),
          subject: subject.trim(),
          body,
        });
        onTemplateIdChange(data.id);
      }
      setEditing(false);
    } catch (err) {
      setError(formatApiError(err, "Could not save template"));
    } finally {
      setSaving(false);
    }
  }

  const showReviewOption =
    allowReviewTemplate && reviewTemplate && reviewTemplateId;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-heading mb-1">
            Email template
          </label>
          <select
            className="input-field w-full text-sm"
            value={templateId}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) {
                onTemplateIdChange("");
                setEditing(false);
                return;
              }
              if (id === reviewTemplateId && reviewTemplate) {
                onTemplateIdChange(id);
                onSubjectChange(reviewTemplate.subject);
                onBodyChange(reviewTemplate.body);
                setEditing(false);
                return;
              }
              const template = templates.find((t) => t.id === id);
              if (template) applyTemplate(template);
            }}
          >
            <option value="">None — write your own</option>
            {showReviewOption && (
              <option value={reviewTemplateId!}>
                Google review invitation
              </option>
            )}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {(selected || showReviewOption || canManageTemplates) && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing((v) => !v);
              setEditName(selected?.name ?? "Google review invitation");
              setError(null);
            }}
          >
            {editing ? "Done editing" : "Edit template"}
          </Button>
        )}
      </div>

      {templates.length === 0 && !showReviewOption && canManageTemplates && (
        <p className="text-xs text-body-muted">
          No templates yet.{" "}
          <Link href="/settings" className="text-[var(--primary)] hover:underline">
            Create templates in Settings
          </Link>
        </p>
      )}

      {editing && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 space-y-2">
          {canManageTemplates && !allowReviewTemplate && !selected && (
            <input
              className="input-field w-full text-sm"
              placeholder="Template name (for new template)"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          )}
          {canManageTemplates && selected && (
            <input
              className="input-field w-full text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          )}
          <p className="text-xs text-body-muted">
            Edit subject and message below, then save to update the template for
            future emails.
          </p>
          {error && (
            <p className="text-xs text-[var(--error)]">{error}</p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void handleSaveTemplate()}
          >
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      )}
    </div>
  );
}
