"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { formatApiError } from "@/lib/validation-errors";
import { formatDateTime } from "@/lib/utils";
import type { Task } from "@/types";
import axios from "axios";

interface AssignableUser {
  id: string;
  label: string;
  email: string;
}

interface TaskDetailModalProps {
  contactId: string;
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

function toLocalDatetimeValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskDetailModal({
  contactId,
  task,
  open,
  onClose,
  onUpdated,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("open");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setDueAt(toLocalDatetimeValue(task.due_at ?? task.due_date));
    setAssignedTo(task.assigned_to ?? task.user_id);
  }, [task]);

  useEffect(() => {
    if (!open) return;
    void axios
      .get<{ data: AssignableUser[] }>("/api/team/members")
      .then((res) => setAssignees(res.data.data))
      .catch(() => setAssignees([]));
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    setError(null);
    try {
      const due_at = dueAt
        ? new Date(dueAt).toISOString()
        : "";
      await axios.patch(`/api/contacts/${contactId}/tasks/${task.id}`, {
        title: title.trim(),
        description,
        status,
        priority,
        due_at,
        assigned_to: assignedTo || undefined,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Could not save task"));
    } finally {
      setSaving(false);
    }
  }

  if (!task) return null;

  return (
    <Modal open={open} onClose={onClose} title="Task">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <FormLabel required>Title</FormLabel>
          <input
            className="input-field w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <FormLabel>Description</FormLabel>
          <textarea
            className="input-field w-full min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FormLabel>Due date & time</FormLabel>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <div>
            <FormLabel>Assigned to</FormLabel>
            <select
              className="input-field w-full"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              {assignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FormLabel>Status</FormLabel>
            <select
              className="input-field w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <FormLabel>Priority</FormLabel>
            <select
              className="input-field w-full"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task["priority"])}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-body-muted">
          Created {formatDateTime(task.created_at)}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
