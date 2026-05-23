"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const items = data?.data ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-md)]">
            <div className="px-4 py-3 border-b border-[var(--card-border)]">
              <p className="text-sm font-semibold text-heading">Notifications</p>
            </div>
            {isLoading ? (
              <p className="p-4 text-sm text-body-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-body-muted">No notifications yet</p>
            ) : (
              <ul className="divide-y divide-[var(--card-border)]">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.is_read) void markRead.mutateAsync(n.id);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-[var(--sidebar-hover)] transition-colors",
                        !n.is_read && "bg-[var(--sidebar-active-bg)]/40"
                      )}
                    >
                      <p className="text-sm font-medium text-heading">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-body-muted mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
