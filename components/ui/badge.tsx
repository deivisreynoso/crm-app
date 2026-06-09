import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "neutral";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--sidebar-active-bg)] text-[var(--primary)]",
  success:
    "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
  warning:
    "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[color-mix(in_srgb,var(--warning)_80%,#0f1419)]",
  error:
    "bg-[color-mix(in_srgb,var(--error)_14%,transparent)] text-[var(--error)]",
  info:
    "bg-[color-mix(in_srgb,var(--secondary)_16%,transparent)] text-[color-mix(in_srgb,var(--secondary)_85%,#0f1419)]",
  neutral: "bg-[var(--sidebar-hover)] text-[var(--muted)]",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ticketStatusVariant(
  status: string
): BadgeVariant {
  switch (status) {
    case "open":
      return "info";
    case "in_progress":
      return "warning";
    case "closed":
      return "success";
    case "on_hold":
      return "neutral";
    default:
      return "default";
  }
}

export function ticketPriorityVariant(
  priority: string
): BadgeVariant {
  switch (priority) {
    case "urgent":
      return "error";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "neutral";
  }
}
