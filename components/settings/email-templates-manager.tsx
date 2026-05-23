"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplates,
} from "@/hooks/useEmailTemplates";
import { formatApiError } from "@/lib/validation-errors";

export function EmailTemplatesManager() {
  const { data: templates = [], isLoading } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        subject: subject.trim(),
        body,
      });
      setName("");
      setSubject("");
      setBody("");
      setOpen(false);
    } catch (err) {
      setError(formatApiError(err, "Could not create template"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <p className="text-sm text-body-muted">
          Reusable email copy for outreach and follow-ups.
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "New template"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {open && (
        <form onSubmit={handleCreate} className="space-y-3 border border-[var(--card-border)] rounded-lg p-4">
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
            className="input-field w-full min-h-[120px]"
            placeholder="Email body…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <Button type="submit" size="sm" disabled={createTemplate.isPending}>
            Save template
          </Button>
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-heading">{t.name}</p>
                <p className="text-xs text-body-muted truncate">{t.subject}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void deleteTemplate.mutateAsync(t.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
