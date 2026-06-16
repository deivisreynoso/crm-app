"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

type ProjectFeedbackRow = {
  id: string;
  score: number | null;
  what_worked_well?: string | null;
  what_to_improve?: string | null;
  would_recommend?: string | null;
  submitted_at: string;
  google_review_sent: boolean;
  google_review_sent_at?: string | null;
};

function stars(score: number) {
  return "★".repeat(score) + "☆".repeat(5 - score);
}

function ReviewChip({ row }: { row: ProjectFeedbackRow }) {
  const { canManage } = useWorkspaceCapabilities();
  if (!canManage) return null;

  if (row.google_review_sent && row.google_review_sent_at) {
    return (
      <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">
        Google review invitation sent on{" "}
        {new Date(row.google_review_sent_at).toLocaleDateString()}
      </span>
    );
  }

  const score = row.score ?? 0;
  const threshold = 4;
  if (score >= threshold) {
    return (
      <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs">
        Google review invitation pending
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">
      Google review withheld — score below threshold
    </span>
  );
}

export function ProjectFeedbackSection({ contactId }: { contactId: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["project-feedback", contactId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: ProjectFeedbackRow[] }>(
        `/api/contacts/${contactId}/project-feedback`
      );
      return data.data;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No project feedback received yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-lg border border-[var(--border)] p-4 text-sm space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-amber-500">{stars(row.score ?? 0)}</span>
            <span className="font-medium">{row.score}/5</span>
            <ReviewChip row={row} />
          </div>
          <p className="text-xs text-[var(--muted)]">
            Submitted: {new Date(row.submitted_at).toLocaleString()}
          </p>
          {row.what_worked_well && (
            <p><strong>What worked well:</strong> {row.what_worked_well}</p>
          )}
          {row.what_to_improve && (
            <p><strong>Could improve:</strong> {row.what_to_improve}</p>
          )}
          {row.would_recommend && (
            <p>
              <strong>Would recommend:</strong>{" "}
              {row.would_recommend === "yes"
                ? "Yes"
                : row.would_recommend === "maybe"
                  ? "Maybe"
                  : "No"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
