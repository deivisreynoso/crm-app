"use client";

import { useState } from "react";
import { Copy, ListTodo, Mail, Phone, StickyNote } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCopyToast } from "@/components/ui/copy-toast";
import { cn } from "@/lib/utils";

interface QuickActionBarProps {
  email?: string | null;
  phone?: string | null;
  className?: string;
  onAddNote?: (content: string) => Promise<void>;
  onAddTask?: (input: { title: string; due_date?: string }) => Promise<void>;
  noteLoading?: boolean;
  taskLoading?: boolean;
}

export function QuickActionBar({
  email,
  phone,
  className,
  onAddNote,
  onAddTask,
  noteLoading,
  taskLoading,
}: QuickActionBarProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const { showCopied, toast: copyToast } = useCopyToast();

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showCopied("Copied");
    } catch {
      showCopied("Copy failed");
    }
  }

  const actions = [
    onAddNote && {
      key: "note",
      label: "Note",
      icon: StickyNote,
      onClick: () => setNoteOpen(true),
    },
    phone?.trim() && {
      key: "call",
      label: "Call",
      icon: Phone,
      href: `tel:${phone.replace(/\s/g, "")}`,
    },
    email?.trim() && {
      key: "email",
      label: "Email",
      icon: Mail,
      href: `mailto:${email}`,
    },
    email?.trim() && {
      key: "copy-email",
      label: "Copy email",
      icon: Copy,
      onClick: () => void copyText(email!),
    },
    phone?.trim() && {
      key: "copy-phone",
      label: "Copy phone",
      icon: Copy,
      onClick: () => void copyText(phone!),
    },
    onAddTask && {
      key: "task",
      label: "Task",
      icon: ListTodo,
      onClick: () => setTaskOpen(true),
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: typeof Phone;
    href?: string;
    onClick?: () => void;
  }>;

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {actions.map((a) => {
          const Icon = a.icon;
          const cls =
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-heading border border-[var(--card-border)] hover:bg-[var(--sidebar-hover)] transition-colors";
          if (a.href) {
            return (
              <a key={a.key} href={a.href} className={cls}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {a.label}
              </a>
            );
          }
          return (
            <button key={a.key} type="button" className={cls} onClick={a.onClick}>
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {a.label}
            </button>
          );
        })}
        {copyToast}
      </div>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Add note">
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
            className="input-field w-full min-h-[120px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What happened on this call or meeting?"
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={noteLoading}>
              Save note
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="Add task">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!onAddTask || !taskTitle.trim()) return;
            await onAddTask({
              title: taskTitle.trim(),
              due_date: taskDue || undefined,
            });
            setTaskTitle("");
            setTaskDue("");
            setTaskOpen(false);
          }}
          className="space-y-3"
        >
          <input
            className="input-field w-full"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Task title"
            required
          />
          <input
            type="date"
            className="input-field w-full"
            value={taskDue}
            onChange={(e) => setTaskDue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={taskLoading}>
              Create task
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
