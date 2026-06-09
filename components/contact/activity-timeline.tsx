"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimelineDateTime } from "@/lib/utils/datetime";
import type { ActivityFeedItem } from "@/types";

type TimelineLabels = {
  authorSystem: string;
  authorTeam: string;
  copy: string;
  copied: string;
  copyFailed: string;
  expand: string;
  collapse: string;
  edit: string;
  delete: string;
  emailReceived: string;
  emailSent: string;
  types: Record<string, string>;
  system: Record<string, string>;
};

type IconConfig = {
  Icon: LucideIcon;
  boxClass: string;
  iconClass: string;
  rowTint?: string;
};

function getIconConfig(item: ActivityFeedItem): IconConfig {
  if (item.is_system) {
    if (item.type === "review_request") {
      return {
        Icon: Star,
        boxClass: "bg-amber-50 border-amber-200",
        iconClass: "text-amber-700",
      };
    }
    if (item.type === "created" || item.type === "update") {
      return {
        Icon: RefreshCw,
        boxClass: "bg-slate-100 border-slate-200",
        iconClass: "text-slate-600",
      };
    }
    return {
      Icon: Lock,
      boxClass: "bg-slate-100 border-slate-200",
      iconClass: "text-slate-600",
    };
  }

  switch (item.type) {
    case "call":
      return {
        Icon: Phone,
        boxClass: "bg-emerald-50 border-emerald-200",
        iconClass: "text-emerald-700",
      };
    case "email":
      if (item.email_direction === "inbound") {
        return {
          Icon: Mail,
          boxClass: "bg-rose-50 border-rose-200",
          iconClass: "text-rose-700",
          rowTint: "bg-rose-50/60",
        };
      }
      return {
        Icon: Mail,
        boxClass: "bg-sky-50 border-sky-200",
        iconClass: "text-sky-700",
        rowTint: "bg-sky-50/50",
      };
    case "meeting":
      return {
        Icon: Calendar,
        boxClass: "bg-violet-50 border-violet-200",
        iconClass: "text-violet-700",
      };
    case "appointment":
      return {
        Icon: Calendar,
        boxClass: "bg-rose-50 border-rose-200",
        iconClass: "text-rose-700",
      };
    case "note":
    default:
      return {
        Icon: FileText,
        boxClass: "bg-slate-100 border-slate-200",
        iconClass: "text-slate-600",
      };
  }
}

function typeLabel(item: ActivityFeedItem, labels: TimelineLabels): string {
  if (item.type === "appointment") return labels.types.appointment ?? "Appointment";
  if (item.is_system) {
    return labels.system[item.type] ?? labels.system.activity ?? "Activity";
  }
  return labels.types[item.type] ?? item.type;
}

function authorName(item: ActivityFeedItem, labels: TimelineLabels): string {
  if (item.author_name?.trim()) return item.author_name.trim();
  if (item.is_system) return labels.authorSystem;
  return labels.authorTeam;
}

function summaryLine(item: ActivityFeedItem, labels: TimelineLabels): string {
  const label = typeLabel(item, labels);
  if (item.type === "email" && item.email_subject) {
    const direction =
      item.email_direction === "inbound"
        ? labels.emailReceived
        : item.email_direction === "outbound"
          ? labels.emailSent
          : "";
    return direction
      ? `${label} · ${direction}: ${item.email_subject}`
      : `${label}: ${item.email_subject}`;
  }
  const firstLine = item.content.split("\n")[0]?.trim() ?? "";
  return firstLine ? `${label}: ${firstLine}` : label;
}

function linkifyText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] underline underline-offset-2 break-all hover:opacity-80"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function ActivityBody({
  item,
  expanded,
  labels,
}: {
  item: ActivityFeedItem;
  expanded: boolean;
  labels: TimelineLabels;
}) {
  if (!expanded) {
    return (
      <p className="text-sm text-heading leading-snug line-clamp-2">
        {linkifyText(summaryLine(item, labels))}
      </p>
    );
  }

  if (item.type === "email" && (item.email_body || item.email_subject)) {
    return (
      <div className="text-sm text-heading space-y-1.5 min-w-0">
        {item.email_subject && (
          <p className="font-medium leading-snug">{item.email_subject}</p>
        )}
        <p className="text-xs text-body-muted">
          {item.email_direction === "inbound"
            ? labels.emailReceived
            : item.email_direction === "outbound"
              ? labels.emailSent
              : labels.types.email}
        </p>
        {item.email_body ? (
          <p className="whitespace-pre-wrap leading-relaxed text-body">
            {linkifyText(item.email_body)}
          </p>
        ) : (
          <p className="text-body-muted italic">{summaryLine(item, labels)}</p>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm text-heading whitespace-pre-wrap leading-relaxed min-w-0">
      {linkifyText(item.content)}
    </p>
  );
}

function TimelineRow({
  item,
  expanded,
  onToggle,
  isLast,
  labels,
  displayTz,
  locale,
  canWrite,
  onEdit,
  onDelete,
}: {
  item: ActivityFeedItem;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
  labels: TimelineLabels;
  displayTz?: string;
  locale: string;
  canWrite?: boolean;
  onEdit?: (item: ActivityFeedItem) => void;
  onDelete?: (item: ActivityFeedItem) => void;
}) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const { Icon, boxClass, iconClass, rowTint } = getIconConfig(item);
  const name = authorName(item, labels);
  const timestamp = formatTimelineDateTime(item.created_at, displayTz, locale);
  const editable = canWrite && item.source === "note" && !item.is_system;

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  async function handleCopy() {
    const text =
      item.type === "email" && item.email_body
        ? [item.email_subject, item.email_body].filter(Boolean).join("\n\n")
        : item.content;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    setMenuOpen(false);
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <li className="relative flex gap-2">
      <div className="flex w-6 shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 flex h-5 w-5 items-center justify-center rounded text-body-muted hover:bg-[var(--surface-subtle)] hover:text-heading"
          aria-expanded={expanded}
          aria-label={expanded ? labels.collapse : labels.expand}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-150",
              expanded && "rotate-90"
            )}
            strokeWidth={2}
          />
        </button>
        {!isLast && (
          <span
            className="mt-1 w-px flex-1 bg-[var(--card-border)]"
            aria-hidden
          />
        )}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1 pb-5 rounded-lg -mx-1 px-1",
          rowTint,
          !isLast && "border-b border-[var(--card-border)]/70"
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-heading leading-tight">
              {name}
            </p>
            <time
              className="text-xs text-body-muted mt-0.5 block"
              dateTime={item.created_at}
              title={displayTz}
            >
              {timestamp}
            </time>

            <div className="mt-2.5 flex items-start gap-2.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded border",
                  boxClass
                )}
              >
                <Icon className={cn("h-4 w-4", iconClass)} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <ActivityBody item={item} expanded={expanded} labels={labels} />
              </div>
            </div>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--card)] text-body-muted hover:text-heading hover:border-[var(--primary)]/30"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
            >
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-md border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-1.5 text-left text-sm text-heading hover:bg-[var(--surface-subtle)]"
                  onClick={() => {
                    onToggle();
                    setMenuOpen(false);
                  }}
                >
                  {expanded ? labels.collapse : labels.expand}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-1.5 text-left text-sm text-heading hover:bg-[var(--surface-subtle)]"
                  onClick={handleCopy}
                >
                  {copyState === "copied"
                    ? labels.copied
                    : copyState === "error"
                      ? labels.copyFailed
                      : labels.copy}
                </button>
                {editable && onEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-1.5 text-left text-sm text-heading hover:bg-[var(--surface-subtle)]"
                    onClick={() => {
                      onEdit(item);
                      setMenuOpen(false);
                    }}
                  >
                    {labels.edit}
                  </button>
                )}
                {editable && onDelete && (
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--error)] hover:bg-red-500/10"
                    onClick={() => {
                      onDelete(item);
                      setMenuOpen(false);
                    }}
                  >
                    {labels.delete}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function ActivityTimeline({
  items,
  labels,
  displayTz,
  locale = "en",
  canWrite = false,
  onEdit,
  onDelete,
}: {
  items: ActivityFeedItem[];
  labels: TimelineLabels;
  displayTz?: string;
  locale?: string;
  canWrite?: boolean;
  onEdit?: (item: ActivityFeedItem) => void;
  onDelete?: (item: ActivityFeedItem) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  function isExpanded(id: string) {
    return expandedIds.has(id);
  }

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-[11px] top-2 bottom-2 w-px bg-[var(--card-border)]"
        aria-hidden
      />
      <ul className="relative space-y-0">
        {items.map((item, index) => (
          <TimelineRow
            key={item.id}
            item={item}
            expanded={isExpanded(item.id)}
            onToggle={() => toggle(item.id)}
            isLast={index === items.length - 1}
            labels={labels}
            displayTz={displayTz}
            locale={locale}
            canWrite={canWrite}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}
