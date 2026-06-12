"use client";

import { useState } from "react";
import { Mail, Phone, ListTodo, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailComposer, type EmailComposerSendPayload } from "@/components/email/email-composer";
import { cn } from "@/lib/utils";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import {
  type ActivityType,
} from "@/lib/constants/activity";
import type { Contact } from "@/types";

type ComposerTab = "post" | "email" | "call" | "task";

type RecordActivityComposerProps = {
  contact: Pick<
    Contact,
    "id" | "first_name" | "last_name" | "email" | "phone" | "company" | "company_id"
  >;
  companyName?: string | null;
  canWrite: boolean;
  gmailConnected: boolean;
  isAdding: boolean;
  isSendingEmail?: boolean;
  onLog: (input: { content: string; activity_type: ActivityType }) => Promise<void>;
  onSendEmail: (payload: EmailComposerSendPayload) => Promise<void>;
  onAddTask: (input: { title: string; due_date?: string | null }) => Promise<void>;
};

export function RecordActivityComposer({
  contact,
  companyName,
  canWrite,
  gmailConnected,
  isAdding,
  isSendingEmail = false,
  onLog,
  onSendEmail,
  onAddTask,
}: RecordActivityComposerProps) {
  const { dict } = useCrmLocale();
  const a = dict.activity;
  const [tab, setTab] = useState<ComposerTab>("post");
  const [content, setContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [templateId, setTemplateId] = useState("");

  if (!canWrite) return null;

  const tabs: { id: ComposerTab; label: string; icon: React.ReactNode }[] = [
    { id: "post", label: "Post", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "email", label: a.email ?? "Email", icon: <Mail className="h-3.5 w-3.5" /> },
    { id: "call", label: a.logCall ?? "Log a Call", icon: <Phone className="h-3.5 w-3.5" /> },
    { id: "task", label: "New Task", icon: <ListTodo className="h-3.5 w-3.5" /> },
  ];

  async function submitPost(type: "note" | "call") {
    if (!content.trim()) return;
    await onLog({ content: content.trim(), activity_type: type });
    setContent("");
  }

  return (
    <div className="mb-6 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] overflow-hidden">
      <nav className="flex border-b border-[var(--card-border)] bg-[var(--card)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-[var(--secondary)] text-[var(--primary)]"
                : "border-transparent text-body-muted hover:text-heading"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <div className="p-4">
        {tab === "post" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitPost("note");
            }}
            className="space-y-3"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder={a.placeholderNote ?? "Share an update…"}
              className="input-field w-full min-h-[72px] text-sm"
            />
            <Button type="submit" size="sm" disabled={isAdding}>
              {a.logActivity ?? "Log activity"}
            </Button>
          </form>
        )}

        {tab === "call" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitPost("call");
            }}
            className="space-y-3"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder={a.placeholderCall ?? "Call notes…"}
              className="input-field w-full min-h-[72px] text-sm"
            />
            <Button type="submit" size="sm" disabled={isAdding}>
              {a.logCall ?? "Log call"}
            </Button>
          </form>
        )}

        {tab === "task" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!taskTitle.trim()) return;
              await onAddTask({
                title: taskTitle.trim(),
                due_date: taskDue || null,
              });
              setTaskTitle("");
              setTaskDue("");
            }}
            className="space-y-3"
          >
            <input
              className="input-field w-full text-sm"
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
            />
            <input
              type="date"
              className="input-field w-full text-sm max-w-xs"
              value={taskDue}
              onChange={(e) => setTaskDue(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={isAdding}>
              Add task
            </Button>
          </form>
        )}

        {tab === "email" && (
          <>
            {!contact.email?.trim() ? (
              <p className="text-sm text-body-muted">This contact has no email address.</p>
            ) : !gmailConnected ? (
              <p className="text-sm text-body-muted">
                Connect Gmail in Settings → Integrations to send email.
              </p>
            ) : (
              <EmailComposer
                contact={contact}
                companyName={companyName}
                defaultTo={contact.email ?? ""}
                templateId={templateId}
                onTemplateIdChange={setTemplateId}
                onSend={onSendEmail}
                sending={isSendingEmail}
                sendLabel="Send email"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
