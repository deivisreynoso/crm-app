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
        "flex gap-8 border-b border-[var(--card-border)]",
        className
      )}
      aria-label="Record sections"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              isActive
                ? "border-[var(--secondary)] text-[var(--primary)]"
                : "border-transparent text-body-muted hover:text-heading hover:border-[var(--card-border)]"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1",
                  isActive ? "text-[var(--primary)]/80" : "text-body-muted"
                )}
              >
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
