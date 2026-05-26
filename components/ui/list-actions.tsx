"use client";

import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ListViewAction({ href, label = "View" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--primary)] hover:bg-[var(--sidebar-hover)] transition-colors"
      aria-label={label}
      title={label}
    >
      <Eye className="h-4 w-4" strokeWidth={1.75} />
    </Link>
  );
}

export function ListDeleteAction({
  onClick,
  disabled,
  label = "Delete",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--error)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
      )}
      aria-label={label}
      title={label}
    >
      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

export function ListActions({
  viewHref,
  onDelete,
  deleteDisabled,
  viewLabel,
  deleteLabel,
}: {
  viewHref: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  viewLabel?: string;
  deleteLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <ListViewAction href={viewHref} label={viewLabel} />
      {onDelete && (
        <ListDeleteAction onClick={onDelete} disabled={deleteDisabled} label={deleteLabel} />
      )}
    </div>
  );
}
