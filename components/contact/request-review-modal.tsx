"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useGmailStatus } from "@/hooks/useGmail";
import { useRequestReview } from "@/hooks/useRequestReview";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
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
  const { data: gmailStatus, isLoading: gmailLoading } = useGmailStatus();
  const { data: settings } = useWorkspaceSettings();
  const { data: templates = [] } = useEmailTemplates();
  const requestReview = useRequestReview(contact.id);
  const [error, setError] = useState<string | null>(null);

  const reviewUrl =
    settings?.google_reviews_url?.trim() || GOOGLE_REVIEWS_URL;
  const connected = gmailStatus?.connected ?? false;

  const preview = useMemo(() => {
    const template = settings?.review_request_template_id
      ? templates.find((t) => t.id === settings.review_request_template_id)
      : undefined;
    const fallback = defaultReviewTemplateContent(locale);
    const subject = template?.subject ?? fallback.subject;
    const body = template?.body ?? fallback.body;
    return renderReviewEmail({
      subject,
      body,
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
  }, [settings, templates, contact, companyName, reviewUrl, locale]);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const contactEmail = contact.email?.trim() ?? "";
  const blocked =
    contact.review_request_opt_out ||
    !contactEmail ||
    !reviewUrl ||
    !connected;

  async function handleSend() {
    setError(null);
    try {
      await requestReview.mutateAsync(
        ticketId ? { ticket_id: ticketId } : undefined
      );
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
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 space-y-2">
              <p className="text-xs text-body-muted">To: {contactEmail}</p>
              <p className="font-medium text-heading">{preview.subject}</p>
              <pre className="text-xs text-body-muted whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                {preview.body}
              </pre>
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
