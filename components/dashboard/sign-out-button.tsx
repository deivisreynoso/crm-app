"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm px-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--sidebar-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      Logout
    </button>
  );
}
