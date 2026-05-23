"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  onAdd: (input: {
    title: string;
    due_at?: string;
    priority?: string;
    assigned_to?: string;
  }) => Promise<Task | void>;
  onOpenTask: (task: Task) => void;
}

const PRIORITY_STYLES = {
  low: "text-slate-500",
  medium: "text-amber-600",
  high: "text-red-600",
};

export function TasksPanel({
  tasks,
  isAdding,
  onAdd,
  onOpenTask,
}: TasksPanelProps) {
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
      <form
        onSubmit={handleSubmit}
        className="space-y-3 p-4 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="input-field w-full"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-body-muted block mb-1">
              Due date & time
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
              Assigned to
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
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={isAdding}>
          Add task
        </Button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-sm text-body-muted text-center py-8">
          No tasks yet. Add a follow-up or reminder above.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--card)]">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="w-full text-left p-4 hover:bg-[var(--sidebar-hover)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-heading text-sm">{task.title}</p>
                  <span className="text-xs text-[var(--secondary)] shrink-0">
                    Open →
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-body-muted">
                  <span>Created {formatDateTime(task.created_at)}</span>
                  {(task.due_at || task.due_date) && (
                    <span>
                      Due{" "}
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
                    {task.priority} priority
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
