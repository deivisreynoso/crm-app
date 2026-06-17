"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useClearAllNotifications,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { getNotificationHref } from "@/lib/notifications/notification-link";
import { formatNotificationMessage } from "@/lib/notifications/format-message";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const clearAll = useClearAllNotifications();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target || panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  async function handleNotificationClick(
    id: string,
    isRead: boolean,
    href: string | null
  ) {
    if (!isRead) {
      try {
        await markRead.mutateAsync(id);
      } catch {
        /* still navigate */
      }
    }
    setOpen(false);
    if (href) router.push(href);
  }

  const items = data?.data ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-md)]">
          <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-heading">Notifications</p>
            {items.length > 0 && (
              <button
                type="button"
                disabled={clearAll.isPending}
                onClick={() => {
                  void clearAll.mutateAsync();
                }}
                className="text-xs font-medium text-body-muted hover:text-heading disabled:opacity-50"
              >
                Clear all
              </button>
            )}
          </div>
          {isLoading ? (
            <p className="p-4 text-sm text-body-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-body-muted">No notifications yet</p>
          ) : (
            <ul className="divide-y divide-[var(--card-border)]">
              {items.map((n) => {
                const href = getNotificationHref(n);
                const message = formatNotificationMessage(n.message);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        void handleNotificationClick(n.id, n.is_read, href);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-[var(--sidebar-hover)] transition-colors",
                        !n.is_read && "bg-[var(--sidebar-active-bg)]/40",
                        href && "cursor-pointer"
                      )}
                    >
                      <p className="text-sm font-medium text-heading">{n.title}</p>
                      {message && (
                        <p className="text-xs text-body-muted mt-0.5 line-clamp-2">
                          {message}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
