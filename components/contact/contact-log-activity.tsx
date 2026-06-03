"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import {
  ACTIVITY_TYPE_STYLES,
  type ActivityType,
} from "@/lib/constants/activity";

const LOG_TYPES = ["call", "note"] as const satisfies readonly ActivityType[];

interface ContactLogActivityProps {
  contactEmail?: string | null;
  canWrite: boolean;
  isAdding: boolean;
  onLog: (input: { content: string; activity_type: ActivityType }) => Promise<void>;
  onSendEmail: () => void;
}

export function ContactLogActivity({
  contactEmail,
  canWrite,
  isAdding,
  onLog,
  onSendEmail,
}: ContactLogActivityProps) {
  const { dict } = useCrmLocale();
  const a = dict.activity;
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [content, setContent] = useState("");

  const typeLabels: Record<(typeof LOG_TYPES)[number], string> = {
    call: a.logCall,
    note: a.logNote,
  };

  if (!canWrite) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await onLog({ content: content.trim(), activity_type: activityType });
    setContent("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] space-y-3"
    >
      <p className="text-xs text-body-muted">{a.logHint}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {LOG_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActivityType(type)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
              activityType === type
                ? ACTIVITY_TYPE_STYLES[type]
                : "bg-[var(--card)] text-body-muted border-[var(--card-border)] hover:border-[var(--primary)]/40"
            )}
          >
            {typeLabels[type]}
          </button>
        ))}
        {contactEmail?.trim() && (
          <button
            type="button"
            onClick={onSendEmail}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
          >
            <Mail className="h-3.5 w-3.5" />
            {a.email}
          </button>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={
          activityType === "call" ? a.placeholderCall : a.placeholderNote
        }
        className="input-field w-full min-h-[72px] text-sm"
      />
      <Button type="submit" size="sm" disabled={isAdding}>
        {a.logActivity}
      </Button>
    </form>
  );
}
