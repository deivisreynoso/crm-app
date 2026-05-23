"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useGmailStatus, useSendContactEmail } from "@/hooks/useGmail";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";

interface SendEmailModalProps {
  contact: Pick<
    Contact,
    "id" | "first_name" | "last_name" | "email" | "phone" | "company" | "company_id"
  >;
  companyName?: string | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export function SendEmailModal({
  contact,
  companyName,
  open,
  onClose,
  onSent,
}: SendEmailModalProps) {
  const { data: gmailStatus, isLoading: statusLoading } = useGmailStatus();
  const { data: templates = [] } = useEmailTemplates();
  const sendEmail = useSendContactEmail(contact.id);

  const [to, setTo] = useState(contact.email ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const templateContext = useMemo(
    () =>
      buildTemplateContext({
        contact,
        company: companyName ? { name: companyName } : null,
      }),
    [contact, companyName]
  );

  useEffect(() => {
    if (!open) return;
    setTo(contact.email ?? "");
    setSubject("");
    setBody("");
    setTemplateId("");
    setError(null);
  }, [open, contact.email]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setSubject(interpolateTemplate(template.subject, templateContext));
    setBody(interpolateTemplate(template.body, templateContext));
  }

  const connected = gmailStatus?.connected ?? false;
  const configured = gmailStatus?.configured ?? true;

  return (
    <Modal open={open} onClose={onClose} title="Send email" size="lg">
      {statusLoading ? (
        <p className="text-sm text-body-muted">Checking Gmail connection…</p>
      ) : !configured ? (
        <div className="space-y-3 text-sm">
          <p className="text-body-muted">
            Gmail is not configured on this server. Ask your admin to set{" "}
            <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="text-xs">GOOGLE_CLIENT_SECRET</code>.
          </p>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : !connected ? (
        <div className="space-y-3 text-sm">
          <p className="text-body-muted">
            Connect Gmail in Settings to send email from ClickIn 360 and log it on
            this contact&apos;s timeline.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Link href="/settings">
              <Button type="button">Go to Settings</Button>
            </Link>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!to.trim()) {
              setError("Recipient email is required");
              return;
            }
            try {
              await sendEmail.mutateAsync({
                to: to.trim(),
                subject: subject.trim(),
                body: body.trim(),
                template_id: templateId || undefined,
              });
              onSent?.();
              onClose();
            } catch (err) {
              setError(formatApiError(err, "Could not send email"));
            }
          }}
        >
          {gmailStatus?.email && (
            <p className="text-xs text-body-muted">
              Sending as <span className="font-medium">{gmailStatus.email}</span>
            </p>
          )}

          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-heading mb-1">
                Template
              </label>
              <select
                className="input-field w-full"
                value={templateId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setTemplateId("");
                    return;
                  }
                  applyTemplate(id);
                }}
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-heading mb-1">To</label>
            <input
              type="email"
              className="input-field w-full"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              Subject
            </label>
            <input
              type="text"
              className="input-field w-full"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-heading mb-1">
              Message
            </label>
            <textarea
              className="input-field w-full min-h-[160px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendEmail.isPending}>
              {sendEmail.isPending ? "Sending…" : "Send email"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
