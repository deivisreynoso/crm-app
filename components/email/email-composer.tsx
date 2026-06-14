"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { fileToBase64 } from "@/lib/email/file-to-base64";
import {
  Braces,
  ExternalLink,
  Eye,
  HardDrive,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { RichTextEditor } from "@/components/email/rich-text-editor";
import { EmailPreviewModal } from "@/components/email/email-preview-modal";
import { MergeFieldPicker } from "@/components/email/merge-field-picker";
import { TemplateActionsMenu } from "@/components/email/template-actions-menu";
import {
  buildTemplateContext,
  highlightUnresolvedMergeFields,
  listMergeFields,
  prepareBodyForSend,
  prepareSubjectForSend,
} from "@/lib/email/merge-fields";
import {
  mergeQuoteEmailContext,
  quoteEmailHasSignatureBlock,
} from "@/lib/email/quote-email-merge";
import { useGmailStatus } from "@/hooks/useGmail";
import { GoogleDrivePickerModal } from "@/components/email/google-drive-picker-modal";
import type { DriveFileItem } from "@/lib/google/drive";
import type { Contact } from "@/types";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";

export type EmailComposerAttachment = {
  id: string;
  file: File;
  source?: "local" | "google_drive";
};

export type EmailComposerSendPayload = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  template_id?: string;
  skip_signature_append?: boolean;
  attachments?: { filename: string; mime_type: string; content_base64: string }[];
};

type RecipientChip = { email: string; label?: string };

type EmailComposerProps = {
  contact?: Pick<
    Contact,
    "id" | "first_name" | "last_name" | "email" | "phone" | "company" | "company_id"
  >;
  companyName?: string | null;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  isReply?: boolean;
  templateId?: string;
  onTemplateIdChange?: (id: string) => void;
  onSend: (payload: EmailComposerSendPayload) => Promise<void>;
  sending?: boolean;
  sendLabel?: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onCancel?: () => void;
  className?: string;
  mergeContextExtras?: Record<string, string | undefined>;
};

function buildSignatureBlock(signatureHtml: string): string {
  return `<hr /><div data-email-signature="true">${signatureHtml}</div>`;
}

export function EmailComposer({
  contact,
  companyName,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  isReply = false,
  templateId = "",
  onTemplateIdChange,
  onSend,
  sending = false,
  sendLabel = "Send",
  fullscreen = false,
  onToggleFullscreen,
  onCancel,
  className,
  mergeContextExtras,
}: EmailComposerProps) {
  const { data: session } = useSession();
  const { data: gmailStatus } = useGmailStatus();

  const [toChips, setToChips] = useState<RecipientChip[]>([]);
  const [extraTo, setExtraTo] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [bodyHtml, setBodyHtml] = useState(defaultBody);
  const [attachments, setAttachments] = useState<EmailComposerAttachment[]>([]);
  const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
  const [signatureAppended, setSignatureAppended] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const templateContext = useMemo(() => {
    const base = contact
      ? buildTemplateContext({
          contact,
          company: companyName ? { name: companyName } : null,
        })
      : {};
    const merged = mergeQuoteEmailContext(
      base as Record<string, string | undefined>,
      mergeContextExtras ?? {}
    );
    return Object.keys(merged).length > 0 ? merged : null;
  }, [contact, companyName, mergeContextExtras]);

  const templateUsesSignatureBlock = useMemo(
    () => quoteEmailHasSignatureBlock(defaultBody),
    [defaultBody]
  );

  const fromLabel = useMemo(() => {
    const name = session?.user?.name?.trim();
    const email = gmailStatus?.email ?? session?.user?.email ?? "";
    if (name && email) return `${name} <${email}>`;
    return email || "Connect Gmail in Settings";
  }, [session, gmailStatus]);

  useEffect(() => {
    const chips: RecipientChip[] = [];
    if (defaultTo.trim()) {
      const label = contact
        ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
        : undefined;
      chips.push({ email: defaultTo.trim(), label: label || undefined });
    }
    setToChips(chips);
    setExtraTo("");
    setCc("");
    setBcc("");
    setShowCc(false);
    setSubject(defaultSubject);
    setBodyHtml(defaultBody || "<p></p>");
    setAttachments([]);
    setSignatureAppended(false);
    setError(null);
  }, [defaultTo, defaultSubject, defaultBody, contact?.id]);

  useEffect(() => {
    if (isReply || templateUsesSignatureBlock) return;
    void axios
      .get<{ email_signature_html?: string }>("/api/account/profile")
      .then((res) => {
        const sig = res.data.email_signature_html?.trim();
        if (sig) {
          setSignatureHtml(sig);
          if (!defaultBody?.trim()) {
            setBodyHtml(`<p></p>${buildSignatureBlock(sig)}`);
            setSignatureAppended(true);
          }
        }
      })
      .catch(() => undefined);
  }, [isReply, defaultBody, templateUsesSignatureBlock]);

  const insertSignature = useCallback(() => {
    if (!signatureHtml) return;
    setBodyHtml((prev) => {
      if (prev.includes('data-email-signature="true"')) return prev;
      return `${prev}${buildSignatureBlock(signatureHtml)}`;
    });
    setSignatureAppended(true);
  }, [signatureHtml]);

  const removeChip = (email: string) => {
    setToChips((prev) => prev.filter((c) => c.email !== email));
  };

  const resolveTo = () => {
    const all = [
      ...toChips.map((c) => c.email),
      ...extraTo
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
    ];
    return all.join(", ");
  };

  async function handleSend() {
    setError(null);
    const to = resolveTo();
    if (!to) {
      setError("At least one recipient is required.");
      return;
    }
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }

    let finalBody = bodyHtml;
    let finalSubject = subject;

    if (templateContext) {
      finalBody = prepareBodyForSend(bodyHtml, templateContext, { stripUnresolved: true });
      finalSubject = prepareSubjectForSend(subject, templateContext, { stripUnresolved: true });
    }

    const attachmentPayload = await Promise.all(
      attachments.map(async (a) => ({
        filename: a.file.name,
        mime_type: a.file.type || "application/octet-stream",
        content_base64: await fileToBase64(a.file),
      }))
    );

    try {
      await onSend({
        to,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: finalSubject.trim(),
        body: finalBody,
        template_id: templateId || undefined,
        skip_signature_append:
          signatureAppended ||
          bodyHtml.includes('data-email-signature="true"') ||
          quoteEmailHasSignatureBlock(bodyHtml) ||
          templateUsesSignatureBlock,
        attachments: attachmentPayload.length ? attachmentPayload : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send email");
    }
  }

  async function handleDriveFileSelect(file: DriveFileItem) {
    if (attachments.length >= 5) {
      setError("Maximum 5 attachments per email.");
      return;
    }

    setDriveLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{
        filename: string;
        mime_type: string;
        content_base64: string;
        web_view_link?: string | null;
      }>(`/api/integrations/google-drive/files/${encodeURIComponent(file.id)}/download`);

      const bytes = Uint8Array.from(atob(data.content_base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mime_type });
      const driveFile = new File([blob], data.filename, { type: data.mime_type });

      setAttachments((prev) => [
        ...prev,
        {
          id: `drive-${file.id}-${Date.now()}`,
          file: driveFile,
          source: "google_drive",
        },
      ]);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const link = file.webViewLink;
        if (link) {
          setBodyHtml(
            (prev) =>
              `${prev}<p><a href="${link}">${file.name}</a> (Google Drive)</p>`
          );
          return;
        }
      }
      setError(formatApiError(err, "Could not attach Drive file"));
    } finally {
      setDriveLoading(false);
    }
  }

  const previewHtml = templateContext
    ? prepareBodyForSend(bodyHtml, templateContext, { stripUnresolved: false })
    : bodyHtml;

  const previewSubject = templateContext
    ? prepareSubjectForSend(subject, templateContext, { stripUnresolved: false })
    : subject;

  return (
    <div className={cn("flex flex-col", fullscreen && "h-full", className)}>
      <div className="space-y-3 flex-1 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-medium text-heading w-12 shrink-0">From</span>
          <select className="input-field flex-1 min-w-[200px] text-sm" disabled value="connected">
            <option value="connected">{fromLabel}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-start gap-2 text-sm">
          <span className="text-xs font-medium text-heading w-12 shrink-0 pt-2">To</span>
          <div className="flex-1 min-w-[200px] space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 input-field min-h-[38px] py-1">
              {toChips.map((chip) => (
                <span
                  key={chip.email}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-900 px-2 py-0.5 text-xs"
                >
                  {chip.label ? `${chip.label} ` : ""}
                  <span className="opacity-80">&lt;{chip.email}&gt;</span>
                  <button
                    type="button"
                    className="hover:text-red-600"
                    onClick={() => removeChip(chip.email)}
                    aria-label="Remove recipient"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className="flex-1 min-w-[120px] border-0 bg-transparent outline-none text-sm py-0.5"
                placeholder={toChips.length ? "Add email…" : "recipient@example.com"}
                value={extraTo}
                onChange={(e) => setExtraTo(e.target.value)}
              />
            </div>
          </div>
          {!showCc && (
            <button
              type="button"
              className="text-xs text-[var(--primary)] hover:underline pt-2"
              onClick={() => setShowCc(true)}
            >
              Cc
            </button>
          )}
        </div>

        {showCc && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-medium text-heading w-12 shrink-0">Cc</span>
            <input
              type="text"
              className="input-field flex-1 text-sm"
              placeholder="Comma-separated emails"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-medium text-heading w-12 shrink-0">Bcc</span>
          <input
            type="text"
            className="input-field flex-1 text-sm"
            placeholder="Comma-separated emails"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-medium text-heading w-12 shrink-0">Subject</span>
          <input
            type="text"
            className="input-field flex-1 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        <RichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          minHeight={fullscreen ? "320px" : "200px"}
          onInsertSignature={signatureHtml ? insertSignature : undefined}
        />

        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--card-border)] px-2 py-1 text-xs"
              >
                <Paperclip className="h-3 w-3" />
                {a.source === "google_drive" && (
                  <HardDrive className="h-3 w-3 text-[var(--secondary)]" />
                )}
                {a.file.name}
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((x) => x.id !== a.id))
                  }
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2 mt-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--card-border)] pt-3 mt-3">
        <div className="flex flex-wrap items-center gap-1">
          <input
            type="file"
            id="email-attach-input"
            className="hidden"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setAttachments((prev) => [
                ...prev,
                ...files.map((file) => ({
                  id: `${file.name}-${file.size}-${Date.now()}`,
                  file,
                })),
              ]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Attach file"
            onClick={() => document.getElementById("email-attach-input")?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Attach from Google Drive"
            disabled={driveLoading || attachments.length >= 5}
            onClick={() => setDrivePickerOpen(true)}
          >
            <HardDrive className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Insert merge field"
            onClick={() => setMergeOpen(true)}
          >
            <Braces className="h-4 w-4" />
          </Button>
          <TemplateActionsMenu
            contact={contact}
            companyName={companyName}
            subject={subject}
            body={bodyHtml}
            templateId={templateId}
            onTemplateIdChange={onTemplateIdChange ?? (() => undefined)}
            onApply={async (s, b, id) => {
              if (subject.trim() || bodyHtml.replace(/<[^>]+>/g, "").trim()) {
                const ok = await confirm({
                  title: "Replace email content?",
                  description: "Replace the current subject and body with this template?",
                  confirmLabel: "Replace",
                });
                if (!ok) return;
              }
              setSubject(s);
              setBodyHtml(b.startsWith("<") ? b : `<p>${b.replace(/\n/g, "<br/>")}</p>`);
              if (onTemplateIdChange) onTemplateIdChange(id);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Preview email"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Clear email and revert"
            onClick={() => setClearOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {onToggleFullscreen && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Open in full screen"
              onClick={onToggleFullscreen}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="button" size="sm" disabled={sending} onClick={() => void handleSend()}>
            {sending ? "Sending…" : sendLabel}
          </Button>
        </div>
      </div>

      <MergeFieldPicker
        open={mergeOpen}
        fields={listMergeFields()}
        onClose={() => setMergeOpen(false)}
        onSelect={(key) => {
          const token = `{{${key}}}`;
          setBodyHtml((prev) => `${prev}<p>${token}</p>`);
          setMergeOpen(false);
        }}
      />

      <EmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        subject={previewSubject}
        bodyHtml={highlightUnresolvedMergeFields(previewHtml)}
        to={resolveTo()}
      />

      <ConfirmDialog {...dialogProps} />
      <GoogleDrivePickerModal
        open={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        onSelect={(file) => void handleDriveFileSelect(file)}
        maxSelections={5}
        selectedCount={attachments.length}
      />
      <ConfirmDialog
        open={clearOpen}
        title="Clear email?"
        description="This will remove the subject, body, and attachments."
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          setSubject("");
          setBodyHtml("<p></p>");
          setAttachments([]);
          setCc("");
          setBcc("");
          setClearOpen(false);
        }}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  );
}
