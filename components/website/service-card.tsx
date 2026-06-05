"use client";

import type { ReactNode } from "react";
import { ga4Events } from "@/lib/analytics/ga4-events";

export function ServiceCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article
      className="website-card-lift rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-sm)]"
      onClick={() => ga4Events.serviceViewed(title, "services-page")}
    >
      {children}
    </article>
  );
}
