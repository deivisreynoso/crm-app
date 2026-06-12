"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EmailComposer, type EmailComposerSendPayload } from "@/components/email/email-composer";
import {
  useGmailStatus,
  useSendContactEmail,
  useSendTicketEmail,
  type ContactEmailMessage,
} from "@/hooks/useGmail";
import { replySubject } from "@/lib/emails/build-gmail-send-options";
import { extractEmailAddress } from "@/lib/google/extract-email-address";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";

interface SendEmailModalProps {
  contact: Pick<
    Contact,
    "id" | "first_name" | "last_name" | "email" | "phone" | "company" | "company_id"
  >;
  ticketId?: string;
  companyName?: string | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  replyTo?: ContactEmailMessage | null;
}

export function SendEmailModal({
  contact,
  ticketId,
  companyName,
  open,
  onClose,
  onSent,
  replyTo,
}: SendEmailModalProps) {
  const { data: gmailStatus, isLoading: statusLoading } = useGmailStatus();
  const sendContactEmail = useSendContactEmail(contact.id);
  const sendTicketEmail = useSendTicketEmail(ticketId ?? "");
  const sendEmail = ticketId ? sendTicketEmail : sendContactEmail;

  const [defaultTo, setDefaultTo] = useState(contact.email ?? "");
  const [defaultSubject, setDefaultSubject] = useState("");
  const [defaultBody, setDefaultBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReply = Boolean(replyTo);

  useEffect(() => {
    if (!open) return;
    if (replyTo) {
      const replyTarget =
        replyTo.direction === "inbound"
          ? extractEmailAddress(replyTo.from_email ?? "") || contact.email || ""
          : extractEmailAddress(replyTo.to_email ?? "") || contact.email || "";
      setDefaultTo(replyTarget);
      setDefaultSubject(replySubject(replyTo.subject));
      setDefaultBody("");
    } else {
      setDefaultTo(contact.email ?? "");
      setDefaultSubject("");
      setDefaultBody("");
    }
    setTemplateId("");
    setError(null);
    setFullscreen(false);
  }, [open, contact.email, replyTo]);

  const connected = gmailStatus?.connected ?? false;
  const configured = gmailStatus?.configured ?? true;
  const title = isReply ? "Reply to email" : "Send email";

  async function handleSend(payload: EmailComposerSendPayload) {
    setError(null);
    try {
      await sendEmail.mutateAsync({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        body: payload.body,
        template_id: payload.template_id,
        skip_signature_append: payload.skip_signature_append,
        attachments: payload.attachments,
        reply_to_gmail_message_id: replyTo?.gmail_message_id,
      });
      onSent?.();
      onClose();
    } catch (err) {
      const msg = formatApiError(err, "Could not send email");
      setError(msg);
      throw new Error(msg);
    }
  }

  const composer = (
    <EmailComposer
      contact={contact}
      companyName={companyName}
      defaultTo={defaultTo}
      defaultSubject={defaultSubject}
      defaultBody={defaultBody}
      isReply={isReply}
      templateId={templateId}
      onTemplateIdChange={setTemplateId}
      onSend={handleSend}
      sending={sendEmail.isPending}
      sendLabel={isReply ? "Send reply" : "Send email"}
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
      onCancel={onClose}
    />
  );

  if (fullscreen && open && connected) {
    return (
      <div className="fixed inset-0 z-[70] bg-[var(--background)] flex flex-col">
        <div className="border-b border-[var(--card-border)] px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setFullscreen(false)}>
            Exit full screen
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 max-w-4xl mx-auto w-full">{composer}</div>
        {error && (
          <p className="text-sm text-[var(--error)] px-4 pb-4">{error}</p>
        )}
      </div>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {statusLoading ? (
        <p className="text-sm text-body-muted">Checking Gmail connection…</p>
      ) : !configured ? (
        <div className="space-y-3 text-sm">
          <p className="text-body-muted">
            Gmail is not configured on this server. Ask your admin to set OAuth
            credentials in Settings → Integrations.
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
        <>
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
