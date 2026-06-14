"use client";

import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  useCreateEmailTemplate,
  useEmailTemplates,
  useUpdateEmailTemplate,
} from "@/hooks/useEmailTemplates";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/email/merge-fields";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type Props = {
  contact?: Pick<
    Contact,
    "first_name" | "last_name" | "email" | "phone" | "company" | "company_id"
  >;
  companyName?: string | null;
  subject: string;
  body: string;
  templateId: string;
  onTemplateIdChange: (id: string) => void;
  onApply: (subject: string, body: string, templateId: string) => void;
};

export function TemplateActionsMenu({
  contact,
  companyName,
  subject,
  body,
  templateId,
  onTemplateIdChange,
  onApply,
}: Props) {
  const { data: templates = [] } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const ctx = contact
    ? buildTemplateContext({
        contact,
        company: companyName ? { name: companyName } : null,
      })
    : null;

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const sub = ctx ? interpolateTemplate(t.subject, ctx) : t.subject;
    const bod = ctx ? interpolateTemplate(t.body, ctx) : t.body;
    onApply(sub, bod, t.id);
    setMenuOpen(false);
  }

  return (
    <>
      <ConfirmDialog {...dialogProps} />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        title="Insert, create, or update template"
        onClick={() => setMenuOpen(true)}
      >
        <FilePlus2 className="h-4 w-4" />
      </Button>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Email templates" size="md">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-heading">Insert template</label>
            <select
              className="input-field w-full mt-1 text-sm"
              value=""
              onChange={(e) => {
                if (e.target.value) applyTemplate(e.target.value);
              }}
            >
              <option value="">Choose…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setSaveOpen(true)}>
            Save current as template…
          </Button>
          {templateId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={updateTemplate.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: "Overwrite template?",
                  description: "Replace the loaded template with the current subject and body.",
                  confirmLabel: "Overwrite",
                  destructive: true,
                });
                if (!ok) return;
                try {
                  await updateTemplate.mutateAsync({
                    id: templateId,
                    input: { subject: subject.trim(), body },
                  });
                  setMenuOpen(false);
                } catch (err) {
                  setError(formatApiError(err, "Could not update template"));
                }
              }}
            >
              Update loaded template
            </Button>
          )}
          {error && <p className="text-xs text-[var(--error)]">{error}</p>}
        </div>
      </Modal>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save as template"
        size="md"
      >
        <div className="space-y-3">
          <input
            className="input-field w-full"
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || createTemplate.isPending}
            onClick={async () => {
              try {
                const { data } = await createTemplate.mutateAsync({
                  name: name.trim(),
                  subject: subject.trim(),
                  body,
                });
                onTemplateIdChange(data.id);
                setSaveOpen(false);
                setMenuOpen(false);
                setName("");
              } catch (err) {
                setError(formatApiError(err, "Could not save template"));
              }
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </>
  );
}
