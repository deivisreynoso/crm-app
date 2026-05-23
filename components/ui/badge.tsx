import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "neutral";

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--sidebar-active-bg)] text-[var(--primary)]",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  error: "bg-red-500/15 text-red-700 dark:text-red-400",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
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
