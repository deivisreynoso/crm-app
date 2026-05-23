"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getUserDisplayName, getUserInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { displayName } = getUserDisplayName(user);
  const initials = getUserInitials(user);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1",
          "border border-[var(--card-border)] bg-[var(--card)]",
          "hover:bg-[var(--sidebar-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          open && "ring-2 ring-[var(--ring)]"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <Avatar initials={initials} size="sm" />
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--muted)] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-md)] py-2 z-50"
        >
          <div className="px-4 py-3 border-b border-[var(--card-border)]">
            <p className="text-sm font-semibold text-heading truncate">{displayName}</p>
            {user.email && (
              <p className="text-xs text-body-muted truncate mt-0.5">{user.email}</p>
            )}
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} />
              My account
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} />
              Settings
            </Link>
          </div>

          <div className="border-t border-[var(--card-border)] py-1">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4 text-[var(--muted)]" strokeWidth={1.75} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
