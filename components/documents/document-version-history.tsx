"use client";

import { useDocumentVersions } from "@/hooks/useDocumentVersions";
import { formatDateTime } from "@/lib/utils";

interface DocumentVersionHistoryProps {
  documentId: string;
  onRestore?: (content: string) => void;
}

export function DocumentVersionHistory({
  documentId,
  onRestore,
}: DocumentVersionHistoryProps) {
  const { data: versions = [], isLoading } = useDocumentVersions(documentId);

  if (isLoading) {
    return <p className="text-xs text-body-muted">Loading history…</p>;
  }

  if (versions.length === 0) {
    return (
      <p className="text-xs text-body-muted">
        Versions are saved when you update the document.
      </p>
    );
  }

  return (
    <ul className="space-y-2 max-h-48 overflow-y-auto">
      {versions.map((v) => (
        <li
          key={v.id}
          className="rounded-md border border-[var(--card-border)] p-2 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-heading">v{v.version_number}</span>
            <span className="text-body-muted">{formatDateTime(v.created_at)}</span>
          </div>
          {v.content && onRestore && (
            <button
              type="button"
              className="mt-1 text-[var(--primary)] hover:underline"
              onClick={() => onRestore(v.content!)}
            >
              Restore content
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
