"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EmailTemplatePicker } from "@/components/contact/email-template-picker";
import {
  useGmailStatus,
  useSendContactEmail,
  useSendTicketEmail,
  type ContactEmailMessage,
} from "@/hooks/useGmail";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
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
  const { canManage } = useWorkspaceCapabilities();
  const { data: gmailStatus, isLoading: statusLoading } = useGmailStatus();
  const sendContactEmail = useSendContactEmail(contact.id);
  const sendTicketEmail = useSendTicketEmail(ticketId ?? "");
  const sendEmail = ticketId ? sendTicketEmail : sendContactEmail;

  const [to, setTo] = useState(contact.email ?? "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isReply = Boolean(replyTo);

  useEffect(() => {
    if (!open) return;
    if (replyTo) {
      const replyTarget =
        replyTo.direction === "inbound"
          ? extractEmailAddress(replyTo.from_email ?? "") || contact.email || ""
          : extractEmailAddress(replyTo.to_email ?? "") || contact.email || "";
      setTo(replyTarget);
      setCc("");
      setSubject(replySubject(replyTo.subject));
      setBody("");
    } else {
      setTo(contact.email ?? "");
      setCc("");
      setSubject("");
      setBody("");
    }
    setTemplateId("");
    setError(null);
  }, [open, contact.email, replyTo]);

  const connected = gmailStatus?.connected ?? false;
  const configured = gmailStatus?.configured ?? true;
  const title = isReply ? "Reply to email" : "Send email";

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
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
                cc: cc.trim() || undefined,
                subject: subject.trim(),
                body: body.trim(),
                template_id: templateId || undefined,
                reply_to_gmail_message_id: replyTo?.gmail_message_id,
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

          <EmailTemplatePicker
            contact={contact}
            companyName={companyName}
            templateId={templateId}
            onTemplateIdChange={setTemplateId}
            subject={subject}
            onSubjectChange={setSubject}
            body={body}
            onBodyChange={setBody}
            canManageTemplates={canManage}
          />

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
            <label className="block text-xs font-medium text-heading mb-1">Cc</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="Optional — comma-separated emails"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
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
              {sendEmail.isPending ? "Sending…" : isReply ? "Send reply" : "Send email"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
