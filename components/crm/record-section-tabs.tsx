"use client";

import { cn } from "@/lib/utils";

export interface SectionTab {
  id: string;
  label: string;
  count?: number;
}

interface RecordSectionTabsProps {
  tabs: SectionTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function RecordSectionTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: RecordSectionTabsProps) {
  return (
    <nav
      className={cn(
        "flex gap-6 border-b border-[var(--card-border)]",
        className
      )}
      aria-label="Record sections"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === tab.id
              ? "border-[var(--secondary)] text-[var(--primary)]"
              : "border-transparent text-body-muted hover:text-heading"
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="ml-1.5 text-body-muted">({tab.count})</span>
          )}
        </button>
      ))}
    </nav>
  );
}
