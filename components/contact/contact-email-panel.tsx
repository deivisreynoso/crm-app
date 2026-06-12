"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import {
  useContactEmails,
  useGmailStatus,
  useSyncContactEmails,
  useSyncTicketEmails,
  useTicketEmails,
  type ContactEmailMessage,
} from "@/hooks/useGmail";
import { EmailHtmlBody } from "@/components/email/email-html-body";
import { formatApiError } from "@/lib/validation-errors";
import type { Contact } from "@/types";

interface ContactEmailPanelProps {
  contact: Pick<Contact, "id" | "email" | "first_name" | "last_name">;
  ticketId?: string;
  onOpenCompose?: (replyTo?: ContactEmailMessage) => void;
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
  onOpenCompose,
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

  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const threads = useMemo(() => groupByThread(messages), [messages]);
  const connected = gmailStatus?.connected ?? false;
  const readAccess = gmailStatus?.read_access ?? false;
  const needsReadReconnect = connected && !readAccess;

  const contactEmail = contact.email?.trim() ?? "";
  const syncInFlight = useRef(false);

  async function runSync(options?: { silent?: boolean }) {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    if (!options?.silent) {
      setError(null);
      setHint(null);
    }
    try {
      const { data } = await syncEmails.mutateAsync();
      if (!options?.silent && data.hint) setHint(data.hint);
      if (
        !options?.silent &&
        data.synced === 0 &&
        messages.length === 0 &&
        !data.hint &&
        !data.error
      ) {
        setHint(
          `No messages saved. Searched Gmail for conversations with ${data.contact_email ?? contactEmail}.`
        );
      }
      if (data.synced > 0) setHint(null);
    } catch (err: unknown) {
      if (options?.silent) return;
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
    } finally {
      syncInFlight.current = false;
    }
  }

  useEffect(() => {
    if (!connected || !readAccess || !contactEmail) return;

    void runSync({ silent: true });
    const intervalId = window.setInterval(() => {
      void runSync({ silent: true });
    }, 120_000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll when connection/contact changes
  }, [connected, readAccess, contactEmail, contact.id, ticketId]);

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
          Replies appear when they land in your Gmail inbox. New replies trigger an
          in-app notification that opens this contact.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={syncEmails.isPending}
            onClick={() => void runSync()}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1", syncEmails.isPending && "animate-spin")}
            />
            Sync from Gmail
          </Button>
          {onOpenCompose && (
            <Button type="button" size="sm" onClick={() => onOpenCompose()}>
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
            No messages yet. Compose an email or sync from Gmail to pull existing
            threads.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {onOpenCompose && (
              <Button type="button" size="sm" onClick={() => onOpenCompose()}>
                Compose email
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={syncEmails.isPending}
              onClick={() => void runSync()}
            >
              Sync from Gmail
            </Button>
          </div>
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
                        ? "bg-sky-50/80 border-l-2 border-sky-300"
                        : "bg-rose-50/80 border-l-2 border-rose-300"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-body-muted">
                        <span className="font-medium text-heading">
                          {msg.direction === "outbound" ? "You" : contact.first_name}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            msg.direction === "outbound"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-rose-100 text-rose-800"
                          )}
                        >
                          {msg.direction === "outbound" ? "Sent" : "Received"}
                        </span>
                        <time>{formatDateTime(msg.sent_at)}</time>
                      </div>
                      {onOpenCompose && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => onOpenCompose(msg)}
                        >
                          <Reply className="h-3.5 w-3.5 mr-1" />
                          Reply
                        </Button>
                      )}
                    </div>
                    <EmailHtmlBody body={msg.body} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
