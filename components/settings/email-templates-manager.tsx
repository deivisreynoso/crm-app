"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplates,
  useUpdateEmailTemplate,
  type EmailTemplate,
} from "@/hooks/useEmailTemplates";
import { formatApiError } from "@/lib/validation-errors";

export function EmailTemplatesManager() {
  const { data: templates = [], isLoading } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setSubject("");
    setBody("");
    setEditing(null);
    setOpen(false);
  }

  function startEdit(t: EmailTemplate) {
    setEditing(t);
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setOpen(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await updateTemplate.mutateAsync({
          id: editing.id,
          input: {
            name: name.trim(),
            subject: subject.trim(),
            body,
          },
        });
      } else {
        await createTemplate.mutateAsync({
          name: name.trim(),
          subject: subject.trim(),
          body,
        });
      }
      resetForm();
    } catch (err) {
      setError(formatApiError(err, editing ? "Could not update template" : "Could not create template"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-sm text-body-muted">
          Reusable email copy for outreach and follow-ups. Google review templates
          are managed under Google review invitations.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (open && !editing) {
              resetForm();
            } else {
              setEditing(null);
              setName("");
              setSubject("");
              setBody("");
              setOpen(true);
            }
          }}
        >
          {open && !editing ? "Cancel" : "New template"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 border border-[var(--card-border)] rounded-lg p-4 bg-[var(--surface-subtle)]"
        >
          <p className="text-sm font-medium text-heading">
            {editing ? `Edit: ${editing.name}` : "New template"}
          </p>
          <input
            className="input-field w-full"
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input-field w-full"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <textarea
            className="input-field w-full min-h-[140px]"
            placeholder="Email body…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createTemplate.isPending || updateTemplate.isPending}>
              {editing ? "Save changes" : "Save template"}
            </Button>
            {editing && (
              <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      )}
      {isLoading ? (
        <p className="text-sm text-body-muted">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-body-muted">No email templates yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg overflow-hidden">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 px-4 py-3 bg-[var(--card)]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-heading">{t.name}</p>
                <p className="text-xs text-body-muted truncate mt-0.5">{t.subject}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void deleteTemplate.mutateAsync(t.id)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
