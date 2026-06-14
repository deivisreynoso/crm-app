"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useConversation,
  useConversationMessagesAfter,
  useConversations,
  useDeleteConversation,
  useReleaseConversation,
  useSendConversationMessage,
  useTakeoverConversation,
} from "@/hooks/useConversations";
import type {
  ConversationListItem,
  ConversationMessageRow,
  ConversationQualification,
} from "@/lib/conversations/types";
import { formatApiError } from "@/lib/validation-errors";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

type FilterTab = "all" | "review" | "whatsapp" | "webchat" | "closed";

function channelBadge(channel: string) {
  return channel === "whatsapp"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-sky-100 text-sky-800";
}

function temperatureClass(temp?: string | null) {
  if (temp === "hot") return "bg-red-100 text-red-800";
  if (temp === "warm") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function MessageBubble({ message }: { message: ConversationMessageRow }) {
  const isVisitor = message.sender_type === "visitor";
  const isHuman = message.sender_type === "human";
  const isSystem = message.sender_type === "system";

  if (isSystem) {
    return (
      <p className="text-center text-xs text-body-muted italic py-1">{message.body}</p>
    );
  }

  const label =
    message.sender_type === "visitor"
      ? "Visitor"
      : message.sender_type === "ai"
        ? "Andrea"
        : "You";

  return (
    <div className={cn("flex", isVisitor ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-sm",
          isVisitor && "bg-[var(--background)] border border-[var(--card-border)]",
          message.sender_type === "ai" && "bg-sky-100 text-sky-950",
          isHuman && "bg-emerald-100 text-emerald-950"
        )}
      >
        <p className="text-[10px] font-medium opacity-70 mb-0.5">{label}</p>
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className="text-[10px] opacity-60 mt-1">
          {new Date(message.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function QualificationPanel({
  qualification,
  contactId,
  pendingAction,
}: {
  qualification: ConversationQualification;
  contactId: string | null;
  pendingAction: string | null;
}) {
  const chips = qualification.signals ?? [];

  return (
    <aside className="w-[260px] shrink-0 border-l border-[var(--card-border)] p-4 space-y-3 overflow-y-auto hidden xl:block">
      <h3 className="text-sm font-semibold text-heading">Qualification</h3>
      {qualification.temperature && (
        <span
          className={cn(
            "inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize",
            temperatureClass(qualification.temperature)
          )}
        >
          {qualification.temperature}
        </span>
      )}
      <dl className="text-sm space-y-2">
        {qualification.name && (
          <>
            <dt className="text-body-muted text-xs">Name</dt>
            <dd>{qualification.name}</dd>
          </>
        )}
        {qualification.email && (
          <>
            <dt className="text-body-muted text-xs">Email</dt>
            <dd>{qualification.email}</dd>
          </>
        )}
        {qualification.phone && (
          <>
            <dt className="text-body-muted text-xs">Phone</dt>
            <dd>{qualification.phone}</dd>
          </>
        )}
        {qualification.platform && (
          <>
            <dt className="text-body-muted text-xs">Platform</dt>
            <dd>{qualification.platform}</dd>
          </>
        )}
        {qualification.friction_area && (
          <>
            <dt className="text-body-muted text-xs">Friction</dt>
            <dd>{qualification.friction_area}</dd>
          </>
        )}
      </dl>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((s) => (
            <span
              key={s}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--card-border)]"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      {qualification.summary && (
        <p className="text-sm text-body-muted">{qualification.summary}</p>
      )}
      {contactId && (
        <Link href={`/contacts/${contactId}`} className="text-sm text-[var(--primary)] hover:underline">
          Open contact
        </Link>
      )}
      {pendingAction && (
        <p className="text-xs text-body-muted">
          Pending: <span className="font-medium">{pendingAction}</span>
        </p>
      )}
    </aside>
  );
}

function ConversationListRow({
  item,
  selected,
  highlighted,
  onSelect,
}: {
  item: ConversationListItem;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-3 border-b border-[var(--card-border)] hover:bg-[var(--sidebar-hover)] transition-colors",
        selected && "bg-[var(--sidebar-active-bg)]/50",
        highlighted && "ring-2 ring-inset ring-amber-400"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
            channelBadge(item.channel)
          )}
        >
          {item.channel}
        </span>
        {item.human_review_requested && (
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" aria-label="Needs review" />
        )}
        <span className="text-[10px] text-body-muted ml-auto">
          {formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm font-medium text-heading truncate">
        {item.contact_name ?? item.external_session_id}
      </p>
      <p className="text-xs text-body-muted truncate mt-0.5">
        {item.last_message_preview ?? "No messages yet"}
      </p>
      <p className="text-[10px] text-body-muted mt-1">
        {item.handler === "human"
          ? item.handler_user_name ?? "Human"
          : "AI"}
      </p>
    </button>
  );
}

export function ConversationsInbox() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { canWrite } = useWorkspaceCapabilities();

  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(highlightId);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const base: Record<string, string | boolean | number> = { limit: 50 };
    if (tab === "review") base.human_review = true;
    if (tab === "whatsapp") base.channel = "whatsapp";
    if (tab === "webchat") base.channel = "webchat";
    if (tab === "closed") base.status = "closed";
    if (search.trim()) base.search = search.trim();
    return base;
  }, [tab, search]);

  const { data: listData, isLoading: listLoading } = useConversations(filters);
  const { data: detail, isLoading: detailLoading, refetch: refetchDetail } = useConversation(selectedId);
  const lastMessageId =
    detail?.messages.length ? detail.messages[detail.messages.length - 1]?.id ?? null : null;
  const pollInbound =
    Boolean(selectedId && detail?.handler === "human" && detail?.channel === "webchat");
  const { data: polledMessages } = useConversationMessagesAfter(
    selectedId,
    lastMessageId,
    pollInbound
  );

  useEffect(() => {
    if (!polledMessages?.length || !detail) return;
    void refetchDetail();
  }, [polledMessages, detail, refetchDetail]);
  const takeover = useTakeoverConversation();
  const release = useReleaseConversation();
  const deleteConversation = useDeleteConversation();
  const sendMessage = useSendConversationMessage(selectedId ?? "");

  useEffect(() => {
    if (highlightId) setSelectedId(highlightId);
  }, [highlightId]);

  useEffect(() => {
    setDeleteError(null);
  }, [selectedId]);

  async function handleDeleteConversation() {
    if (!selectedId || !detail) return;
    const label =
      (detail.qualification as ConversationQualification)?.name ??
      detail.external_session_id;
    if (
      !window.confirm(
        `Delete this conversation with ${label}? All messages will be removed permanently.`
      )
    ) {
      return;
    }
    setDeleteError(null);
    try {
      await deleteConversation.mutateAsync(selectedId);
      setSelectedId(null);
    } catch (err) {
      setDeleteError(formatApiError(err, "Could not delete conversation"));
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSendError(null);
    try {
      await sendMessage.mutateAsync(draft.trim());
      setDraft("");
    } catch (err) {
      setSendError(formatApiError(err, "Could not send message"));
    }
  }

  const items = listData?.data ?? [];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[480px] border border-[var(--card-border)] rounded-xl overflow-hidden bg-[var(--card)]">
      <div className="flex flex-1 min-h-0">
        <div className="w-full sm:w-80 shrink-0 border-r border-[var(--card-border)] flex flex-col min-h-0">
          <div className="p-3 border-b border-[var(--card-border)] space-y-2">
            <input
              className="input-field w-full text-sm"
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["review", "Needs Review"],
                  ["whatsapp", "WhatsApp"],
                  ["webchat", "Webchat"],
                  ["closed", "Closed"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-full border",
                    tab === id
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--sidebar-active-bg)]/40"
                      : "border-transparent text-body-muted hover:text-heading"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <p className="p-4 text-sm text-body-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-body-muted">No conversations yet.</p>
            ) : (
              items.map((item) => (
                <ConversationListRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  highlighted={item.id === highlightId}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-body-muted">
              Select a conversation
            </div>
          ) : detailLoading || !detail ? (
            <div className="flex-1 flex items-center justify-center text-sm text-body-muted">
              Loading conversation…
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[var(--card-border)] flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-heading truncate">
                    {(detail.qualification as ConversationQualification)?.name ??
                      detail.external_session_id}
                  </p>
                  <p className="text-xs text-body-muted truncate">
                    {detail.channel} · {detail.external_session_id}
                  </p>
                </div>
                {canWrite && (
                  <>
                    {detail.handler === "human" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={release.isPending}
                        onClick={() => void release.mutateAsync(detail.id)}
                      >
                        Hand back to Andrea
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={takeover.isPending}
                        onClick={() => void takeover.mutateAsync(detail.id)}
                      >
                        Take over
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deleteConversation.isPending}
                      onClick={() => void handleDeleteConversation()}
                      className="text-[var(--error)] hover:text-[var(--error)]"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {deleteError && (
                <p className="px-4 py-2 text-xs text-[var(--error)] border-b border-[var(--card-border)]">
                  {deleteError}
                </p>
              )}

              <div className="flex flex-1 min-h-0">
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {detail.messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </div>

                  <form onSubmit={handleSend} className="p-3 border-t border-[var(--card-border)]">
                    {sendError && (
                      <p className="text-xs text-[var(--error)] mb-2">{sendError}</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        className="input-field flex-1 text-sm"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={
                          detail.handler === "human"
                            ? "Type a reply…"
                            : "Take over to send a reply"
                        }
                        disabled={detail.handler !== "human" || !canWrite}
                        title={
                          detail.handler !== "human"
                            ? "Take over the conversation to send a reply"
                            : undefined
                        }
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          detail.handler !== "human" ||
                          !canWrite ||
                          sendMessage.isPending ||
                          !draft.trim()
                        }
                      >
                        Send
                      </Button>
                    </div>
                  </form>
                </div>

                <QualificationPanel
                  qualification={(detail.qualification ?? {}) as ConversationQualification}
                  contactId={detail.contact_id}
                  pendingAction={detail.pending_action}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
