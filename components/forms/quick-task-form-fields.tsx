"use client";

import { useEffect, useState } from "react";
import { FormLabel } from "@/components/ui/form-label";
import axios from "axios";

export interface QuickTaskFormValues {
  title: string;
  due_at: string;
  priority: "low" | "medium" | "high";
  assigned_to: string;
}

interface AssignableUser {
  id: string;
  label: string;
}

interface QuickTaskFormFieldsProps {
  values: QuickTaskFormValues;
  onChange: (values: QuickTaskFormValues) => void;
}

export function QuickTaskFormFields({ values, onChange }: QuickTaskFormFieldsProps) {
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);

  useEffect(() => {
    void axios
      .get<{ data: AssignableUser[] }>("/api/team/members")
      .then((res) => {
        setAssignees(res.data.data);
        if (!values.assigned_to && res.data.data[0]) {
          onChange({ ...values, assigned_to: res.data.data[0].id });
        }
      })
      .catch(() => setAssignees([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init assignee once
  }, []);

  function patch(partial: Partial<QuickTaskFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="space-y-3">
      <div>
        <FormLabel required>Title</FormLabel>
        <input
          className="input-field w-full"
          value={values.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Task title"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FormLabel>Due date & time</FormLabel>
          <input
            type="datetime-local"
            className="input-field w-full"
            value={values.due_at}
            onChange={(e) => patch({ due_at: e.target.value })}
          />
        </div>
        <div>
          <FormLabel>Assigned to</FormLabel>
          <select
            className="input-field w-full"
            value={values.assigned_to}
            onChange={(e) => patch({ assigned_to: e.target.value })}
          >
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <FormLabel>Priority</FormLabel>
          <select
            className="input-field w-full"
            value={values.priority}
            onChange={(e) =>
              patch({ priority: e.target.value as QuickTaskFormValues["priority"] })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export const EMPTY_QUICK_TASK: QuickTaskFormValues = {
  title: "",
  due_at: "",
  priority: "medium",
  assigned_to: "",
};
