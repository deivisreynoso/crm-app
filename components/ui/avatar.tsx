import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0",
        "bg-[var(--primary)] text-[var(--primary-foreground)] ring-2 ring-[var(--card)]",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
