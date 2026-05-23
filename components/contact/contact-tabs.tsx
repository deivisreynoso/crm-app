"use client";

import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "related", label: "Related" },
  { id: "activity", label: "Activity" },
  { id: "tasks", label: "Tasks" },
] as const;

export type ContactTab = (typeof TABS)[number]["id"];

interface ContactTabsProps {
  activeTab: ContactTab;
  onTabChange: (tab: ContactTab) => void;
  activityCount: number;
  taskCount: number;
  relatedCount?: number;
}

export function ContactTabs({
  activeTab,
  onTabChange,
  activityCount,
  taskCount,
  relatedCount,
}: ContactTabsProps) {
  const counts: Record<ContactTab, number | undefined> = {
    overview: undefined,
    related: relatedCount,
    activity: activityCount,
    tasks: taskCount,
  };

  return (
    <nav className="flex gap-1 border-b border-[var(--card-border)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === tab.id
              ? "border-[var(--secondary)] text-[var(--primary)]"
              : "border-transparent text-body-muted hover:text-heading"
          )}
        >
          {tab.label}
          {counts[tab.id] !== undefined && counts[tab.id]! > 0 && (
            <span className="ml-1.5 text-xs text-body-muted">({counts[tab.id]})</span>
          )}
        </button>
      ))}
    </nav>
  );
}
