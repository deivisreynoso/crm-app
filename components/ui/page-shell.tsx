import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-heading tracking-tight">{title}</h1>
        {description && (
          <p className="text-body-muted text-sm mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

interface DetailFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function DetailField({ label, children, className }: DetailFieldProps) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
        {label}
      </dt>
      <dd className="text-sm text-heading font-medium">{children}</dd>
    </div>
  );
}

export function DataTableShell({
  children,
  empty,
  isLoading,
  loadingMessage = "Loading…",
}: {
  children?: React.ReactNode;
  empty?: React.ReactNode;
  isLoading?: boolean;
  loadingMessage?: string;
}) {
  if (isLoading) {
    return (
      <div className="surface-card p-8 text-body-muted text-sm">{loadingMessage}</div>
    );
  }
  if (empty) {
    return <div className="surface-card p-8 text-body-muted text-sm">{empty}</div>;
  }
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn("w-full text-sm", className)}>
      {children}
    </table>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[var(--surface-subtle)] border-b border-[var(--card-border)]">
      {children}
    </thead>
  );
}

export function DataTableHeadCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-[var(--card-border)]">{children}</tbody>;
}

export function DataTableRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="hover:bg-[var(--sidebar-hover)] transition-colors">{children}</tr>
  );
}

export function DataTableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-[var(--foreground)]",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </td>
  );
}
