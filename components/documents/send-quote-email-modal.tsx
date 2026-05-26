"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { useGmailStatus } from "@/hooks/useGmail";
import {
  useSendDocumentViaGmail,
  type SendDocumentViaGmailInput,
} from "@/hooks/useDocument";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { getQuoteEmailDefaults } from "@/lib/crm/quote-pdf-labels";
import { formatApiError } from "@/lib/validation-errors";

type Props = {
  documentId: string;
  documentTitle: string;
  quoteReference?: string | null;
  defaultTo?: string | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export function SendQuoteEmailModal({
  documentId,
  documentTitle,
  quoteReference,
  defaultTo,
  open,
  onClose,
  onSent,
}: Props) {
  const { locale } = useCrmLocale();
  const emailDefaults = getQuoteEmailDefaults(locale);
  const refLabel = quoteReference?.trim() || documentTitle;
  const defaultSubject = `${emailDefaults.subjectPrefix} ${refLabel}`;

  const { data: gmailStatus, isLoading: statusLoading } = useGmailStatus();
  const sendQuote = useSendDocumentViaGmail(documentId);

  const [to, setTo] = useState(defaultTo ?? "");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(emailDefaults.body);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const defaults = getQuoteEmailDefaults(locale);
    const ref = quoteReference?.trim() || documentTitle;
    setTo(defaultTo ?? "");
    setSubject(`${defaults.subjectPrefix} ${ref}`);
    setBody(defaults.body);
    setError(null);
  }, [open, defaultTo, documentTitle, quoteReference, locale]);

  const connected = gmailStatus?.connected ?? false;
  const configured = gmailStatus?.configured ?? true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: SendDocumentViaGmailInput = {
      to: to.trim() || undefined,
      subject: subject.trim() || undefined,
      body: body.trim() || undefined,
    };
    try {
      await sendQuote.mutateAsync(payload);
      onSent?.();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Could not send quote"));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send quote via email" size="lg">
      {statusLoading ? (
        <p className="text-sm text-body-muted">Checking mailbox connection…</p>
      ) : !configured ? (
        <div className="space-y-3 text-sm">
          <p className="text-body-muted">
            Google OAuth is not configured on this server yet. An admin can complete the
            checklist under Settings → Integrations → Google Workspace.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : !connected ? (
        <div className="space-y-3 text-sm">
          <p className="text-body-muted">
            Connect your Google Workspace or Gmail account to send this quote with a PDF
            attachment from your company address.
          </p>
          <a href="/api/auth/google-gmail" className="inline-flex">
            <Button type="button" size="sm">
              Connect mailbox
            </Button>
          </a>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {gmailStatus?.email && (
            <p className="text-xs text-body-muted">
              Sending as <span className="font-medium">{gmailStatus.email}</span>
              {" · PDF attached automatically"}
            </p>
          )}
          {error && <p className="text-sm text-[var(--error)]">{error}</p>}
          <div>
            <FormLabel>To</FormLabel>
            <input
              type="email"
              className="input-field w-full"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              placeholder="customer@company.com"
            />
          </div>
          <div>
            <FormLabel>Subject</FormLabel>
            <input
              className="input-field w-full"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div>
            <FormLabel>Message</FormLabel>
            <textarea
              className="input-field w-full min-h-[140px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={sendQuote.isPending}>
              <Mail className="h-4 w-4 mr-1.5" />
              {sendQuote.isPending ? "Sending…" : "Send with PDF"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
