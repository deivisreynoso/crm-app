"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
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
  canWrite?: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted?: () => void;
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
  canWrite = true,
  onClose,
  onUpdated,
  onDeleted,
}: TaskDetailModalProps) {
  const { dict } = useCrmLocale();
  const t = dict.tasks;
  const act = dict.actions;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("open");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    if (!task || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const due_at = dueAt ? new Date(dueAt).toISOString() : "";
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
      setError(formatApiError(err, t.saveFailed));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task || !canWrite) return;
    setDeleting(true);
    setError(null);
    try {
      await axios.delete(`/api/contacts/${contactId}/tasks/${task.id}`);
      setDeleteOpen(false);
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(formatApiError(err, t.deleteFailed));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!task) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={t.detailTitle}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <FormLabel required>{t.titleLabel}</FormLabel>
            <input
              className="input-field w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!canWrite}
            />
          </div>
          <div>
            <FormLabel>{t.descriptionLabel}</FormLabel>
            <textarea
              className="input-field w-full min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={!canWrite}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FormLabel>{t.dueDateTime}</FormLabel>
              <input
                type="datetime-local"
                className="input-field w-full"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                readOnly={!canWrite}
              />
            </div>
            <div>
              <FormLabel>{t.assignedTo}</FormLabel>
              <select
                className="input-field w-full"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={!canWrite}
              >
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FormLabel>{t.statusLabel}</FormLabel>
              <select
                className="input-field w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                disabled={!canWrite}
              >
                <option value="open">{t.statusOpen}</option>
                <option value="in_progress">{t.statusInProgress}</option>
                <option value="completed">{t.statusCompleted}</option>
              </select>
            </div>
            <div>
              <FormLabel>{t.priorityLabel}</FormLabel>
              <select
                className="input-field w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                disabled={!canWrite}
              >
                <option value="low">{t.priorityLow}</option>
                <option value="medium">{t.priorityMedium}</option>
                <option value="high">{t.priorityHigh}</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-body-muted">
            {t.created} {formatDateTime(task.created_at)}
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            {canWrite && onDeleted ? (
              <Button
                type="button"
                variant="outline"
                className="text-[var(--error)] border-[var(--error)]/30 hover:bg-red-500/10"
                onClick={() => setDeleteOpen(true)}
                disabled={saving || deleting}
              >
                {act.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {act.cancel}
              </Button>
              {canWrite && (
                <Button type="submit" disabled={saving || deleting}>
                  {saving ? t.saving : act.save}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={act.delete}
        cancelLabel={act.cancel}
        destructive
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
