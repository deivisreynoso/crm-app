"use client";

import Link from "next/link";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { formatApiError } from "@/lib/validation-errors";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function actorLabel(row: {
  actor_display_name: string | null;
  actor_email: string | null;
  user_id: string | null;
}) {
  if (row.actor_display_name?.trim()) {
    return row.actor_email
      ? `${row.actor_display_name} (${row.actor_email})`
      : row.actor_display_name;
  }
  if (row.actor_email) return row.actor_email;
  if (row.user_id) return row.user_id.slice(0, 8);
  return "—";
}

function entityLink(
  entityType: string | null,
  entityId: string | null
): string | null {
  if (!entityId) return null;
  if (entityType === "contact") return `/contacts/${entityId}`;
  if (entityType === "ticket") return `/tickets/${entityId}`;
  if (entityType === "document") return `/quotes/${entityId}`;
  return null;
}

export function AuditLogsPanel() {
  const { dict } = useCrmLocale();
  const s = dict.settings;
  const { data, isLoading, error, refetch, isFetching } = useAuditLogs(1, 50);

  if (error) {
    return (
      <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
        {formatApiError(error, s?.auditLogsLoadError ?? "Failed to load audit log")}
      </p>
    );
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        {s?.auditLogsHelp ??
          "Workspace changes recorded for owners and admins. Sales and viewers cannot see this log."}
      </p>
      <button
        type="button"
        onClick={() => void refetch()}
        disabled={isFetching}
        className="text-sm text-[var(--primary)] hover:underline disabled:opacity-50"
      >
        {isFetching
          ? (s?.auditLogsRefreshing ?? "Refreshing…")
          : (s?.auditLogsRefresh ?? "Refresh")}
      </button>
      {isLoading ? (
        <p className="text-sm text-body-muted">{s?.auditLogsLoading ?? "Loading…"}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-body-muted">{s?.auditLogsEmpty ?? "No audit entries yet."}</p>
      ) : (
        <ul className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
          {rows.map((row) => {
            const href = entityLink(row.entity_type, row.entity_id);
            return (
              <li
                key={row.id}
                className="border border-[var(--card-border)] rounded-lg p-3 bg-[var(--card)] text-sm space-y-1"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-heading">{row.action}</span>
                  <time className="text-xs text-body-muted" dateTime={row.timestamp}>
                    {formatWhen(row.timestamp)}
                  </time>
                </div>
                <p className="text-body-muted">
                  {s?.auditLogsBy ?? "By"} {actorLabel(row)}
                </p>
                {row.change_summary && (
                  <p className="text-heading">{row.change_summary}</p>
                )}
                {row.entity_name && (
                  <p className="text-body-muted">
                    {row.entity_type ?? "record"}:{" "}
                    {href ? (
                      <Link href={href} className="text-[var(--primary)] hover:underline">
                        {row.entity_name}
                      </Link>
                    ) : (
                      row.entity_name
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data && data.total > rows.length && (
        <p className="text-xs text-body-muted">
          {(s?.auditLogsShowing ?? "Showing {count} of {total}")
            .replace("{count}", String(rows.length))
            .replace("{total}", String(data.total))}
        </p>
      )}
    </div>
  );
}
