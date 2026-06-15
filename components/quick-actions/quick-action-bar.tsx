"use client";

import { useState, type ReactNode } from "react";
import { Copy, ListTodo, Mail, Phone, Star, StickyNote } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCopyToast } from "@/components/ui/copy-toast";
import {
  EMPTY_QUICK_TASK,
  QuickTaskFormFields,
  type QuickTaskFormValues,
} from "@/components/forms/quick-task-form-fields";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { cn } from "@/lib/utils";

export interface QuickTaskInput {
  title: string;
  due_at?: string;
  priority?: string;
  assigned_to?: string;
}

interface QuickActionBarProps {
  email?: string | null;
  phone?: string | null;
  className?: string;
  onSendEmail?: () => void;
  onRequestReview?: () => void;
  onAddNote?: (content: string) => Promise<void>;
  onAddTask?: (input: QuickTaskInput) => Promise<void>;
  onTaskCreated?: () => void;
  noteLoading?: boolean;
  taskLoading?: boolean;
  /** Trailing toolbar items (e.g. Start onboarding, Edit) rendered after standard chips */
  trailing?: ReactNode;
}

/** Compact chips with subtle color cues per action type */
const ACTION_STYLES: Record<string, string> = {
  note: "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100",
  call: "border-blue-200 bg-blue-50/90 text-blue-800 hover:bg-blue-100",
  email: "border-violet-200 bg-violet-50/90 text-violet-800 hover:bg-violet-100",
  review: "border-amber-200 bg-amber-50/90 text-amber-900 hover:bg-amber-100",
  task: "border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100",
  "copy-email":
    "border-[var(--card-border)] bg-[var(--card)] text-body-muted hover:bg-[var(--sidebar-hover)]",
  "copy-phone":
    "border-[var(--card-border)] bg-[var(--card)] text-body-muted hover:bg-[var(--sidebar-hover)]",
};

export function QuickActionBar({
  email,
  phone,
  className,
  onSendEmail,
  onRequestReview,
  onAddNote,
  onAddTask,
  onTaskCreated,
  noteLoading,
  taskLoading,
  trailing,
}: QuickActionBarProps) {
  const { dict } = useCrmLocale();
  const q = dict.quickActions;
  const act = dict.actions;
  const r = dict.reviewRequest;
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [taskForm, setTaskForm] = useState<QuickTaskFormValues>(EMPTY_QUICK_TASK);
  const { showCopied, toast: copyToast } = useCopyToast();

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showCopied(q.copied);
    } catch {
      showCopied(q.copyFailed);
    }
  }

  const actions = [
    onAddNote && {
      key: "note",
      label: q.note,
      icon: StickyNote,
      onClick: () => setNoteOpen(true),
    },
    phone?.trim() && {
      key: "call",
      label: q.call,
      icon: Phone,
      href: `tel:${phone.replace(/\s/g, "")}`,
    },
    email?.trim() &&
      (onSendEmail
        ? {
            key: "email",
            label: q.email,
            icon: Mail,
            onClick: onSendEmail,
          }
        : {
            key: "email",
            label: q.email,
            icon: Mail,
            href: `mailto:${email}`,
          }),
    onRequestReview &&
      email?.trim() && {
        key: "review",
        label: r.action,
        icon: Star,
        onClick: onRequestReview,
      },
    onAddTask && {
      key: "task",
      label: q.task,
      icon: ListTodo,
      onClick: () => {
        setTaskForm(EMPTY_QUICK_TASK);
        setTaskOpen(true);
      },
    },
    email?.trim() && {
      key: "copy-email",
      label: q.copyEmail,
      icon: Copy,
      onClick: () => void copyText(email!),
    },
    phone?.trim() && {
      key: "copy-phone",
      label: q.copyPhone,
      icon: Copy,
      onClick: () => void copyText(phone!),
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: typeof Phone;
    href?: string;
    onClick?: () => void;
  }>;

  const chipCls =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border transition-colors";

  return (
    <>
      <div
        className={cn("flex flex-wrap items-center gap-1.5", className)}
        role="toolbar"
        aria-label={q.toolbar}
      >
        {actions.map((a) => {
          const Icon = a.icon;
          const cls = cn(chipCls, ACTION_STYLES[a.key] ?? ACTION_STYLES.note);
          if (a.href) {
            return (
              <a key={a.key} href={a.href} className={cls}>
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                {a.label}
              </a>
            );
          }
          return (
            <button key={a.key} type="button" className={cls} onClick={a.onClick}>
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {a.label}
            </button>
          );
        })}
        {trailing}
        {copyToast}
      </div>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title={q.addNoteTitle}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!onAddNote || !noteText.trim()) return;
            await onAddNote(noteText.trim());
            setNoteText("");
            setNoteOpen(false);
          }}
          className="space-y-3"
        >
          <textarea
            className="input-field w-full min-h-[100px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={q.addNotePlaceholder}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setNoteOpen(false)}>
              {act.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={noteLoading}>
              {q.saveNote}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title={q.addTaskTitle}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!onAddTask || !taskForm.title.trim()) return;
            const due_at = taskForm.due_at
              ? new Date(taskForm.due_at).toISOString()
              : undefined;
            await onAddTask({
              title: taskForm.title.trim(),
              due_at,
              priority: taskForm.priority,
              assigned_to: taskForm.assigned_to || undefined,
            });
            setTaskForm(EMPTY_QUICK_TASK);
            setTaskOpen(false);
            onTaskCreated?.();
          }}
          className="space-y-3"
        >
          <QuickTaskFormFields values={taskForm} onChange={setTaskForm} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setTaskOpen(false)}>
              {act.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={taskLoading}>
              {q.createTask}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
