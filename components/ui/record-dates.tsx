"use client";

import { formatDateTime } from "@/lib/utils";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

interface RecordDatesProps {
  createdAt: string;
  updatedAt: string;
  className?: string;
}

export function RecordDates({ createdAt, updatedAt, className }: RecordDatesProps) {
  const { dict } = useCrmLocale();
  const c = dict.common;

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-4 mt-2 border-t border-[var(--card-border)] ${className ?? ""}`}
    >
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          {c.created}
        </dt>
        <dd className="text-sm text-heading">{formatDateTime(createdAt)}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          {c.lastUpdated}
        </dt>
        <dd className="text-sm text-heading">{formatDateTime(updatedAt)}</dd>
      </div>
    </div>
  );
}
