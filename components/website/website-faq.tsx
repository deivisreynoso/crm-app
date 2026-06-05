"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ga4Events } from "@/lib/analytics/ga4-events";
import type { WebsiteDictionary } from "@/lib/website/i18n";

type Props = {
  dict: WebsiteDictionary;
};

export function WebsiteFaq({ dict }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[var(--surface-subtle)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
            {dict.faq.title}
          </h2>
          <p className="mt-3 text-body-muted text-lg">{dict.faq.subtitle}</p>
        </div>

        <div className="space-y-8">
          {dict.faqItems.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--secondary)] mb-3 px-1">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, idx) => {
                  const id = `${group.category}-${idx}`;
                  const isOpen = openId === id;
                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden shadow-[var(--shadow-sm)]"
                    >
                      <button
                        type="button"
                        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left font-semibold text-heading hover:bg-[var(--sidebar-hover)] transition-colors"
                        onClick={() => {
                          if (!isOpen) {
                            ga4Events.faqClicked(item.q, group.category);
                          }
                          setOpenId(isOpen ? null : id);
                        }}
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm sm:text-base leading-snug">{item.q}</span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 text-[var(--secondary)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-body-muted leading-relaxed border-t border-[var(--card-border)] pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
