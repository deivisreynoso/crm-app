import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  accent?: "navy" | "sky" | "magenta" | "success";
}

const accentStyles = {
  navy: "bg-[var(--primary)] text-[var(--primary-foreground)]",
  sky: "bg-[var(--secondary)] text-[#0f1419]",
  magenta: "bg-[var(--accent)] text-white",
  success: "bg-[var(--success)] text-white",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = "navy",
}: StatCardProps) {
  const inner = (
    <>
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
          accentStyles[accent]
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-body-muted text-sm">{label}</p>
        <p className="text-heading text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
      </div>
    </>
  );

  const className =
    "surface-card p-5 flex items-start gap-3 hover:shadow-[var(--shadow-md)] transition-all duration-200";

  if (href) {
    return (
      <Link href={href} className={cn(className, "block")}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
