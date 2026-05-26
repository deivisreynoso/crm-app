"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TEMPLATE_VARIABLES } from "@/lib/documents/template-variables";
import { QUOTE_DOCUMENT_CREATE_TYPE } from "@/lib/documents/kinds";
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
  const [content, setContent] = useState(
    "Hello {{first_name}},\n\nPlease find our {{service_name}} quote for {{amount}} {{currency}}.\n\nValid until {{valid_until}}."
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createTemplate.mutateAsync({
      name,
      type: QUOTE_DOCUMENT_CREATE_TYPE,
      content,
    });
    setName("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3">
        <input
          className="input-field w-full"
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
                <p className="text-xs text-body-muted">Quote template</p>
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
