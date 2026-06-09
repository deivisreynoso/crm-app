"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EmailTemplatePicker } from "@/components/contact/email-template-picker";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useGmailStatus } from "@/hooks/useGmail";
import { useRequestReview } from "@/hooks/useRequestReview";
import { useReviewEmailTemplate } from "@/hooks/useReviewEmailTemplate";
import { useUpdateEmailTemplate } from "@/hooks/useEmailTemplates";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { GOOGLE_REVIEWS_URL } from "@/lib/website/google-reviews-url";
import { defaultReviewTemplateContent } from "@/lib/reviews/default-review-template";
import { renderReviewEmail } from "@/lib/reviews/review-template-context";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";

type Props = {
  contact: Pick<
    Contact,
    | "id"
    | "first_name"
    | "last_name"
    | "email"
    | "phone"
    | "company"
    | "company_id"
    | "review_request_opt_out"
  >;
  companyName?: string | null;
  ticketId?: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export function RequestReviewModal({
  contact,
  companyName,
  ticketId,
  open,
  onClose,
  onSent,
}: Props) {
  const { dict, locale } = useCrmLocale();
  const r = dict.reviewRequest;
  const { canManage } = useWorkspaceCapabilities();
  const { data: gmailStatus, isLoading: gmailLoading } = useGmailStatus();
  const { data: settings } = useWorkspaceSettings();
  const { data: reviewTemplate } = useReviewEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const requestReview = useRequestReview(contact.id);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reviewUrl =
    settings?.google_reviews_url?.trim() || GOOGLE_REVIEWS_URL;
  const connected = gmailStatus?.connected ?? false;
  const contactEmail = contact.email?.trim() ?? "";
  const reviewTemplateId = settings?.review_request_template_id ?? null;

  const baseTemplate = useMemo(() => {
    if (reviewTemplate) {
      return { subject: reviewTemplate.subject, body: reviewTemplate.body };
    }
    return defaultReviewTemplateContent(locale);
  }, [reviewTemplate, locale]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCc("");
    setTemplateId(reviewTemplateId ?? "");
    const rendered = renderReviewEmail({
      subject: baseTemplate.subject,
      body: baseTemplate.body,
      contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
      },
      companyName,
      googleReviewUrl: reviewUrl,
    });
    setSubject(rendered.subject);
    setBody(rendered.body);
  }, [
    open,
    baseTemplate,
    contact,
    companyName,
    reviewUrl,
    reviewTemplateId,
  ]);

  const blocked =
    contact.review_request_opt_out ||
    !contactEmail ||
    !reviewUrl ||
    !connected;

  async function handleSaveReviewTemplate(input: {
    subject: string;
    body: string;
  }) {
    if (!reviewTemplateId || !canManage) return;
    await updateTemplate.mutateAsync({
      id: reviewTemplateId,
      input: { subject: input.subject.trim(), body: input.body },
    });
  }

  async function handleSend() {
    setError(null);
    try {
      await requestReview.mutateAsync({
        ticket_id: ticketId,
        subject: subject.trim(),
        body: body.trim(),
        cc: cc.trim() || undefined,
      });
      onSent?.();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Could not send review invitation"));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={r?.title ?? "Request Google review"}>
      <div className="space-y-4 text-sm">
        <p className="text-body-muted">{r?.previewHint}</p>

        {gmailLoading ? (
          <p className="text-body-muted">…</p>
        ) : !connected ? (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-3 space-y-2">
            <p>{r?.gmailRequired}</p>
            <Link href="/settings" className="text-[var(--primary)] hover:underline text-sm">
              Settings → Integrations
            </Link>
          </div>
        ) : !contactEmail ? (
          <p className="text-[var(--error)]">{r?.noEmail}</p>
        ) : contact.review_request_opt_out ? (
          <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {r?.optedOut}
          </p>
        ) : !reviewUrl ? (
          <p className="text-[var(--error)]">
            {r?.configureUrl}{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>
          </p>
        ) : (
          <>
            {canManage && reviewTemplateId && reviewTemplate && (
              <EmailTemplatePicker
                contact={contact}
                companyName={companyName}
                templateId={templateId}
                onTemplateIdChange={(id) => {
                  setTemplateId(id);
                  if (id === reviewTemplateId && reviewTemplate) {
                    const rendered = renderReviewEmail({
                      subject: reviewTemplate.subject,
                      body: reviewTemplate.body,
                      contact,
                      companyName,
                      googleReviewUrl: reviewUrl,
                    });
                    setSubject(rendered.subject);
                    setBody(rendered.body);
                  }
                }}
                subject={subject}
                onSubjectChange={setSubject}
                body={body}
                onBodyChange={setBody}
                canManageTemplates={canManage}
                allowReviewTemplate
                reviewTemplate={reviewTemplate}
                reviewTemplateId={reviewTemplateId}
                onSaveReviewTemplate={handleSaveReviewTemplate}
              />
            )}

            <div>
              <label className="block text-xs font-medium text-heading mb-1">To</label>
              <input
                type="email"
                className="input-field w-full text-sm"
                value={contactEmail}
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-heading mb-1">Cc</label>
              <input
                type="text"
                className="input-field w-full text-sm"
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
                className="input-field w-full text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-heading mb-1">
                Message
              </label>
              <textarea
                className="input-field w-full min-h-[140px] text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={blocked || requestReview.isPending}
                onClick={() => void handleSend()}
              >
                {requestReview.isPending ? r?.sending : r?.send}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
