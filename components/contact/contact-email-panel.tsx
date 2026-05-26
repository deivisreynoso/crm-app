"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import {
  useContactEmails,
  useGmailStatus,
  useSendContactEmail,
  useSendTicketEmail,
  useSyncContactEmails,
  useSyncTicketEmails,
  useTicketEmails,
  type ContactEmailMessage,
} from "@/hooks/useGmail";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";

interface ContactEmailPanelProps {
  contact: Pick<Contact, "id" | "email" | "first_name" | "last_name">;
  ticketId?: string;
  onOpenFullCompose?: () => void;
}

function groupByThread(messages: ContactEmailMessage[]) {
  const threads = new Map<string, ContactEmailMessage[]>();
  for (const msg of messages) {
    const key = msg.gmail_thread_id ?? msg.id;
    const list = threads.get(key) ?? [];
    list.push(msg);
    threads.set(key, list);
  }
  return [...threads.values()].sort((a, b) => {
    const aLast = a[a.length - 1]?.sent_at ?? "";
    const bLast = b[b.length - 1]?.sent_at ?? "";
    return new Date(aLast).getTime() - new Date(bLast).getTime();
  });
}

export function ContactEmailPanel({
  contact,
  ticketId,
  onOpenFullCompose,
}: ContactEmailPanelProps) {
  const { data: gmailStatus } = useGmailStatus();
  const contactEmailsQuery = useContactEmails(contact.id);
  const ticketEmailsQuery = useTicketEmails(ticketId ?? "");
  const { data: messages = [], isLoading } = ticketId
    ? ticketEmailsQuery
    : contactEmailsQuery;
  const syncContactEmails = useSyncContactEmails(contact.id);
  const syncTicketEmails = useSyncTicketEmails(ticketId ?? "");
  const syncEmails = ticketId ? syncTicketEmails : syncContactEmails;
  const sendContactEmail = useSendContactEmail(contact.id);
  const sendTicketEmail = useSendTicketEmail(ticketId ?? "");
  const sendEmail = ticketId ? sendTicketEmail : sendContactEmail;

  const [replyBody, setReplyBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const threads = useMemo(() => groupByThread(messages), [messages]);
  const lastMessage = messages[messages.length - 1];
  const connected = gmailStatus?.connected ?? false;
  const readAccess = gmailStatus?.read_access ?? false;
  const needsReadReconnect = connected && !readAccess;

  const contactEmail = contact.email?.trim() ?? "";

  async function handleSync() {
    setError(null);
    setHint(null);
    try {
      const { data } = await syncEmails.mutateAsync();
      if (data.hint) setHint(data.hint);
      if (data.synced === 0 && messages.length === 0 && !data.hint && !data.error) {
        setHint(
          `No messages saved. Searched Gmail for conversations with ${data.contact_email ?? contactEmail}.`
        );
      }
      if (data.synced > 0) setHint(null);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string; needs_reauth?: boolean } };
      };
      if (axiosErr.response?.data?.needs_reauth) {
        setError(
          axiosErr.response.data.error ??
            "Gmail read access missing. Reconnect to approve sync permissions."
        );
      } else {
        setError(formatApiError(err, "Could not sync from Gmail"));
      }
    }
  }

  async function handleQuickReply(e: React.FormEvent) {
    e.preventDefault();
    if (!contactEmail || !replyBody.trim()) return;
    setError(null);

    const subject =
      replySubject.trim() ||
      (lastMessage?.subject?.startsWith("Re:")
        ? lastMessage.subject
        : lastMessage?.subject
          ? `Re: ${lastMessage.subject}`
          : "Follow up");

    try {
      await sendEmail.mutateAsync({
        to: contactEmail,
        subject,
        body: replyBody.trim(),
      });
      setReplyBody("");
      setReplySubject("");
    } catch (err) {
      setError(formatApiError(err, "Could not send email"));
    }
  }

  if (!contactEmail) {
    return (
      <p className="text-sm text-body-muted py-6 text-center">
        {ticketId
          ? "The linked contact has no email address. Add one on the contact record to send and sync messages for this ticket."
          : "Add an email address to this contact to send and sync messages."}
      </p>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-4 text-sm space-y-3">
        <p>
          Connect Gmail in Settings to send email from ClickIn 360 and sync
          conversations with {contact.first_name}.
        </p>
        <Link href="/settings">
          <Button type="button" size="sm">
            Connect Gmail
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-body-muted">
          {gmailStatus?.email ? `Sending as ${gmailStatus.email}` : "Gmail connected"}
          {" · "}
          Syncing with contact: <span className="font-medium">{contactEmail}</span>
        </p>
        <p className="text-xs text-body-muted w-full">
          Replies sync when they land in your Gmail inbox—the contact can use any email
          provider. Mail that never goes through Gmail (e.g. iCloud-only) will not appear.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={syncEmails.isPending}
            onClick={() => void handleSync()}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1", syncEmails.isPending && "animate-spin")}
            />
            Sync from Gmail
          </Button>
          {onOpenFullCompose && (
            <Button type="button" size="sm" onClick={onOpenFullCompose}>
              <Mail className="h-3.5 w-3.5 mr-1" />
              Compose
            </Button>
          )}
        </div>
      </div>

      {hint && !error && (
        <p className="text-sm text-amber-800 bg-amber-500/10 rounded-lg px-3 py-2">
          {hint}
        </p>
      )}

      {(error || needsReadReconnect) && (
        <div className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2 space-y-2">
          <p>
            {error ??
              "Gmail can send email but cannot sync threads yet. Reconnect once to grant read access."}
          </p>
          {(needsReadReconnect || error?.includes("read access")) && (
            <a href="/api/auth/google-gmail/reconnect">
              <Button type="button" size="sm" variant="outline">
                Reconnect Gmail
              </Button>
            </a>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-body-muted py-8 text-center">Loading emails…</p>
      ) : messages.length === 0 ? (
        <div className="text-center py-10 space-y-3 border border-dashed border-[var(--card-border)] rounded-lg">
          <p className="text-sm text-body-muted">
            No messages yet. Send an email below or sync from Gmail to pull existing
            threads.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={syncEmails.isPending}
            onClick={() => void handleSync()}
          >
            Sync from Gmail
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-h-[min(480px,60vh)] overflow-y-auto pr-1">
          {threads.map((thread) => (
            <div
              key={thread[0]?.gmail_thread_id ?? thread[0]?.id}
              className="rounded-lg border border-[var(--card-border)] overflow-hidden"
            >
              {thread[0]?.subject && (
                <div className="px-3 py-2 bg-[var(--surface-subtle)] border-b border-[var(--card-border)]">
                  <p className="text-xs font-semibold text-heading truncate">
                    {thread[0].subject}
                  </p>
                </div>
              )}
              <ul className="divide-y divide-[var(--card-border)]">
                {thread.map((msg) => (
                  <li
                    key={msg.id}
                    className={cn(
                      "px-3 py-3 text-sm",
                      msg.direction === "outbound"
                        ? "bg-[var(--primary)]/5"
                        : "bg-[var(--card)]"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1 text-xs text-body-muted">
                      <span className="font-medium text-heading">
                        {msg.direction === "outbound" ? "You" : contact.first_name}
                      </span>
                      <time>{formatDateTime(msg.sent_at)}</time>
                    </div>
                    <p className="text-heading whitespace-pre-wrap">{msg.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => void handleQuickReply(e)}
        className="space-y-3 p-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]"
      >
        <p className="text-xs font-medium text-heading">Reply from CRM</p>
        <input
          type="text"
          className="input-field w-full text-sm"
          placeholder={
            lastMessage?.subject ? `Re: ${lastMessage.subject}` : "Subject"
          }
          value={replySubject}
          onChange={(e) => setReplySubject(e.target.value)}
        />
        <textarea
          className="input-field w-full min-h-[100px] text-sm"
          placeholder={`Write to ${contact.first_name}…`}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          required
        />
        <Button type="submit" size="sm" disabled={sendEmail.isPending}>
          {sendEmail.isPending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
