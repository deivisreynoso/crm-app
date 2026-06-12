"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EmailComposer, type EmailComposerSendPayload } from "@/components/email/email-composer";
import { useGmailStatus } from "@/hooks/useGmail";
import {
  useSendDocumentViaGmail,
} from "@/hooks/useDocument";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { getQuoteEmailDefaults } from "@/lib/crm/quote-pdf-labels";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";

type Props = {
  documentId: string;
  documentTitle: string;
  quoteReference?: string | null;
  defaultTo?: string | null;
  contact?: Pick<
    Contact,
    "id" | "first_name" | "last_name" | "email" | "phone" | "company" | "company_id"
  > | null;
  companyName?: string | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export function SendQuoteEmailModal({
  documentId,
  documentTitle,
  quoteReference,
  defaultTo,
  contact,
  companyName,
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

  const [defaultToValue, setDefaultToValue] = useState(defaultTo ?? "");
  const [defaultSubjectValue, setDefaultSubjectValue] = useState(defaultSubject);
  const [defaultBodyValue, setDefaultBodyValue] = useState(emailDefaults.body);
  const [templateId, setTemplateId] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const defaults = getQuoteEmailDefaults(locale);
    const ref = quoteReference?.trim() || documentTitle;
    setDefaultToValue(defaultTo ?? contact?.email ?? "");
    setDefaultSubjectValue(`${defaults.subjectPrefix} ${ref}`);
    setDefaultBodyValue(defaults.body);
    setTemplateId("");
    setError(null);
    setFullscreen(false);
  }, [open, defaultTo, contact?.email, documentTitle, quoteReference, locale]);

  const connected = gmailStatus?.connected ?? false;
  const configured = gmailStatus?.configured ?? true;

  async function handleSend(payload: EmailComposerSendPayload) {
    setError(null);
    try {
      await sendQuote.mutateAsync({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        body: payload.body,
        template_id: payload.template_id,
        skip_signature_append: payload.skip_signature_append,
        attachments: payload.attachments,
      });
      onSent?.();
      onClose();
    } catch (err) {
      const msg = formatApiError(err, "Could not send quote");
      setError(msg);
      throw new Error(msg);
    }
  }

  const composer = (
    <EmailComposer
      contact={contact ?? undefined}
      companyName={companyName}
      defaultTo={defaultToValue}
      defaultSubject={defaultSubjectValue}
      defaultBody={defaultBodyValue}
      templateId={templateId}
      onTemplateIdChange={setTemplateId}
      onSend={handleSend}
      sending={sendQuote.isPending}
      sendLabel="Send with PDF"
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
      onCancel={onClose}
    />
  );

  if (fullscreen && open && connected) {
    return (
      <div className="fixed inset-0 z-[70] bg-[var(--background)] flex flex-col">
        <div className="border-b border-[var(--card-border)] px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Send quote via email</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setFullscreen(false)}>
            Exit full screen
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 max-w-4xl mx-auto w-full">
          {gmailStatus?.email && (
            <p className="text-xs text-body-muted mb-3">
              Sending as <span className="font-medium">{gmailStatus.email}</span>
              {" · PDF attached automatically"}
            </p>
          )}
          {composer}
        </div>
        {error && <p className="text-sm text-[var(--error)] px-4 pb-4">{error}</p>}
      </div>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Send quote via email" size="xl">
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
        <>
          {gmailStatus?.email && (
            <p className="text-xs text-body-muted mb-3">
              Sending as <span className="font-medium">{gmailStatus.email}</span>
              {" · PDF attached automatically"}
            </p>
          )}
          {error && (
            <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}
          {composer}
        </>
      )}
    </Modal>
  );
}
