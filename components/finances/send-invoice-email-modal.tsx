"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EmailComposer, type EmailComposerSendPayload } from "@/components/email/email-composer";
import { useGmailStatus } from "@/hooks/useGmail";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact, Invoice } from "@/types";

type Props = {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export function SendInvoiceEmailModal({ invoice, open, onClose, onSent }: Props) {
  const { data: gmailStatus, isLoading: statusLoading } = useGmailStatus();
  const contact = invoice.contact as
    | Pick<Contact, "id" | "first_name" | "last_name" | "email">
    | null
    | undefined;

  const [defaultTo, setDefaultTo] = useState(contact?.email ?? "");
  const [defaultSubject, setDefaultSubject] = useState(`Invoice ${invoice.invoice_number}`);
  const [defaultBody, setDefaultBody] = useState(
    `<p>Please find invoice <strong>${invoice.invoice_number}</strong> attached.</p>`
  );
  const [templateId, setTemplateId] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDefaultTo(contact?.email ?? "");
    setDefaultSubject(`Invoice ${invoice.invoice_number}`);
    setDefaultBody(
      `<p>Please find invoice <strong>${invoice.invoice_number}</strong> attached.</p>`
    );
    setError(null);
  }, [open, invoice.invoice_number, contact?.email]);

  async function handleSend(payload: EmailComposerSendPayload) {
    setError(null);
    setSending(true);
    try {
      await axios.post(`/api/finances/invoices/${invoice.id}/send-via-gmail`, {
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        body: payload.body,
        template_id: payload.template_id,
        skip_signature_append: payload.skip_signature_append,
      });
      onSent?.();
      onClose();
    } catch (err) {
      const msg = formatApiError(err, "Could not send invoice");
      setError(msg);
      throw new Error(msg);
    } finally {
      setSending(false);
    }
  }

  const connected = gmailStatus?.connected ?? false;
  const configured = gmailStatus?.configured ?? true;

  const composer = (
    <EmailComposer
      contact={contact ?? undefined}
      defaultTo={defaultTo}
      defaultSubject={defaultSubject}
      defaultBody={defaultBody}
      templateId={templateId}
      onTemplateIdChange={setTemplateId}
      onSend={handleSend}
      sending={sending}
      sendLabel="Send with PDF"
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
      onCancel={onClose}
    />
  );

  return (
    <Modal open={open} onClose={onClose} title="Send invoice via email" size="xl">
      {statusLoading ? (
        <p className="text-sm text-body-muted">Preparing email…</p>
      ) : !configured ? (
        <p className="text-sm text-body-muted">
          Google OAuth is not configured. Complete setup under Settings → Integrations.
        </p>
      ) : !connected ? (
        <div className="space-y-3 text-sm">
          <p className="text-body-muted">Connect Gmail to send invoices with PDF attachments.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
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
