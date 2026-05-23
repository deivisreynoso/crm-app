"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TEMPLATE_VARIABLES } from "@/lib/documents/template-variables";
import {
  useCreateDocumentTemplate,
  useDeleteDocumentTemplate,
  useDocumentTemplates,
} from "@/hooks/useDocumentTemplates";

export function TemplateEditor() {
  const { data: templates = [], isLoading } = useDocumentTemplates();
  const createTemplate = useCreateDocumentTemplate();
  const deleteTemplate = useDeleteDocumentTemplate();
  const [name, setName] = useState("");
  const [type, setType] = useState("estimate");
  const [content, setContent] = useState(
    "Hello {{first_name}},\n\nPlease find our {{service_name}} estimate for {{amount}} {{currency}}.\n\nValid until {{valid_until}}."
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createTemplate.mutateAsync({ name, type, content });
    setName("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="input-field"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="estimate">Estimate</option>
            <option value="proposal">Proposal</option>
            <option value="contract">Contract</option>
          </select>
        </div>
        <textarea
          className="input-field min-h-[160px] font-mono text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <p className="text-xs text-body-muted">
          Variables:{" "}
          {TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(", ")}
        </p>
        <Button type="submit" size="sm" disabled={createTemplate.isPending}>
          Save template
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-body-muted">Loading templates…</p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--card-border)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-heading">{t.name}</p>
                <p className="text-xs text-body-muted capitalize">{t.type ?? "—"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void deleteTemplate.mutateAsync(t.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
