"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarFooter() {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/settings");

  return (
    <div className="border-t border-[var(--sidebar-border)] p-3">
      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-fg)] shadow-sm"
            : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Settings
          className={cn(
            "h-5 w-5 shrink-0",
            isActive
              ? "text-[var(--sidebar-active-fg)]"
              : "text-[var(--sidebar-text-muted)]"
          )}
          strokeWidth={1.75}
        />
        Settings
      </Link>
    </div>
  );
}
