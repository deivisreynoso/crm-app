"use client";

import { cn } from "@/lib/utils";

export type RecordTab = "related" | "details";

interface RecordTabsProps {
  activeTab: RecordTab;
  onTabChange: (tab: RecordTab) => void;
}

export function RecordTabs({ activeTab, onTabChange }: RecordTabsProps) {
  const tabs: { id: RecordTab; label: string }[] = [
    { id: "related", label: "Related" },
    { id: "details", label: "Details" },
  ];

  return (
    <nav className="flex gap-6 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === tab.id
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
