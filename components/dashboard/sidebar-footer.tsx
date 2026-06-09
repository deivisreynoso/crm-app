"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { navIconAccentStyles } from "@/components/dashboard/sidebar-nav";

export function SidebarFooter() {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/settings");

  return (
    <div className="border-t border-[var(--sidebar-border)] p-2">
      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-fg)] shadow-sm"
            : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
            isActive
              ? navIconAccentStyles.navy.active
              : navIconAccentStyles.navy.idle
          )}
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Settings
      </Link>
    </div>
  );
}
