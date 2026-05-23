"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RelatedListSectionProps {
  title: string;
  count: number;
  iconBg: string;
  iconGlyph: string;
  onNew?: () => void;
  newLabel?: string;
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export function RelatedListSection({
  title,
  count,
  iconBg,
  iconGlyph,
  onNew,
  newLabel = "New",
  viewAllHref,
  children,
  className,
}: RelatedListSectionProps) {
  return (
    <section
      className={cn(
        "border border-slate-200 rounded-lg bg-white overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "w-8 h-8 rounded flex items-center justify-center text-white text-sm shrink-0",
              iconBg
            )}
          >
            {iconGlyph}
          </span>
          <h3 className="text-sm font-semibold text-slate-900 truncate">
            {title}{" "}
            <span className="text-slate-500 font-normal">({count})</span>
          </h3>
        </div>
        {onNew && (
          <Button type="button" size="sm" variant="outline" onClick={onNew}>
            {newLabel}
          </Button>
        )}
      </div>
      <div className="p-4">{children}</div>
      {viewAllHref && count > 0 && (
        <div className="border-t border-slate-100 px-4 py-2 text-center">
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            View All
          </Link>
        </div>
      )}
    </section>
  );
}

export function RelatedRecordCard({
  href,
  title,
  subtitle,
  meta,
  onClick,
}: {
  href?: string;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-sm font-medium text-blue-700 hover:underline truncate">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-600 mt-0.5 truncate">{subtitle}</p>
      )}
      {meta && <div className="mt-2 text-xs text-slate-500">{meta}</div>}
    </>
  );

  const className =
    "block p-3 border border-slate-200 rounded-md bg-white hover:border-slate-300 transition-colors min-w-[200px] flex-1";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(className, "text-left")}>
      {inner}
    </button>
  );
}

export function RelatedCardsRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3 overflow-x-auto pb-1">{children}</div>
  );
}
