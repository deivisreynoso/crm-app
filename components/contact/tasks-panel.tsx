"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { Task } from "@/types";
import axios from "axios";

interface AssignableUser {
  id: string;
  label: string;
}

interface TasksPanelProps {
  tasks: Task[];
  isAdding: boolean;
  canWrite?: boolean;
  onAdd: (input: {
    title: string;
    due_at?: string;
    priority?: string;
    assigned_to?: string;
  }) => Promise<Task | void>;
  onOpenTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

const PRIORITY_STYLES = {
  low: "text-slate-500",
  medium: "text-amber-600",
  high: "text-red-600",
};

function TaskRowMenu({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { dict } = useCrmLocale();
  const act = dict.actions;

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="flex h-7 w-7 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--card)] text-body-muted hover:text-heading hover:border-[var(--primary)]/30"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
      </button>
      {menuOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-md border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-1.5 text-left text-sm text-heading hover:bg-[var(--surface-subtle)]"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setMenuOpen(false);
            }}
          >
            {act.edit}
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-1.5 text-left text-sm text-[var(--error)] hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setMenuOpen(false);
            }}
          >
            {act.delete}
          </button>
        </div>
      )}
    </div>
  );
}

export function TasksPanel({
  tasks,
  isAdding,
  canWrite = false,
  onAdd,
  onOpenTask,
  onDeleteTask,
}: TasksPanelProps) {
  const { dict } = useCrmLocale();
  const t = dict.tasks;
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);

  useEffect(() => {
    void axios
      .get<{ data: AssignableUser[] }>("/api/team/members")
      .then((res) => {
        setAssignees(res.data.data);
        if (res.data.data[0]) setAssignedTo(res.data.data[0].id);
      })
      .catch(() => setAssignees([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const due_at = dueAt ? new Date(dueAt).toISOString() : undefined;
    const created = await onAdd({
      title: title.trim(),
      due_at,
      priority,
      assigned_to: assignedTo || undefined,
    });
    setTitle("");
    setDueAt("");
    setPriority("medium");
    if (created && typeof created === "object" && "id" in created) {
      onOpenTask(created as Task);
    }
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 p-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            className="input-field w-full"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-body-muted block mb-1">
                {t.dueDateTime}
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-body-muted block mb-1">
                {t.assignedTo}
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="input-field w-full"
              >
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "low" | "medium" | "high")
              }
              className="input-field w-full sm:col-span-2"
            >
              <option value="low">{t.priorityLow}</option>
              <option value="medium">{t.priorityMedium}</option>
              <option value="high">{t.priorityHigh}</option>
            </select>
          </div>
          <Button type="submit" size="sm" disabled={isAdding}>
            {t.addTask}
          </Button>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-body-muted text-center py-8">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--card)]">
          {tasks.map((task) => (
            <li key={task.id}>
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="min-w-0 flex-1 text-left p-4 hover:bg-[var(--sidebar-hover)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-heading text-sm">{task.title}</p>
                    {!canWrite && (
                      <span className="text-xs text-[var(--secondary)] shrink-0">
                        {t.open}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-body-muted">
                    <span>
                      {t.created} {formatDateTime(task.created_at)}
                    </span>
                    {(task.due_at || task.due_date) && (
                      <span>
                        {t.due}{" "}
                        {task.due_at
                          ? formatDateTime(task.due_at)
                          : formatDate(task.due_date!)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "capitalize font-medium",
                        PRIORITY_STYLES[task.priority]
                      )}
                    >
                      {task.priority} {t.prioritySuffix}
                    </span>
                    <span
                      className={cn(
                        "capitalize",
                        task.status === "completed"
                          ? "text-green-600"
                          : "text-body-muted"
                      )}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                </button>
                {canWrite && onDeleteTask && (
                  <div className="flex items-start p-4 pl-0">
                    <TaskRowMenu
                      task={task}
                      onEdit={() => onOpenTask(task)}
                      onDelete={() => onDeleteTask(task)}
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
