"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { Task } from "@/types";

interface TasksPanelProps {
  tasks: Task[];
  isAdding: boolean;
  onAdd: (input: {
    title: string;
    due_date?: string;
    priority?: string;
  }) => Promise<void>;
}

const PRIORITY_STYLES = {
  low: "text-slate-500",
  medium: "text-amber-600",
  high: "text-red-600",
};

export function TasksPanel({ tasks, isAdding, onAdd }: TasksPanelProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd({
      title: title.trim(),
      due_date: dueDate || undefined,
      priority,
    });
    setTitle("");
    setDueDate("");
    setPriority("medium");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
          />
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as "low" | "medium" | "high")
            }
            className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={isAdding}>
          Add task
        </Button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          No tasks yet. Add a follow-up or reminder above.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-white">
          {tasks.map((task) => (
            <li key={task.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                <span
                  className={cn(
                    "text-xs font-medium capitalize shrink-0",
                    task.status === "completed"
                      ? "text-green-600"
                      : "text-slate-500"
                  )}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                <span>Created {formatDateTime(task.created_at)}</span>
                {task.due_date && (
                  <span>Due {formatDate(task.due_date)}</span>
                )}
                <span
                  className={cn(
                    "capitalize font-medium",
                    PRIORITY_STYLES[task.priority]
                  )}
                >
                  {task.priority} priority
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
