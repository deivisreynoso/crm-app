import { cn } from "@/lib/utils";

interface ListFiltersPanelProps {
  toolbar?: React.ReactNode;
  savedFilters?: React.ReactNode;
  resultCount?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  clearLabel?: string;
  gridClassName?: string;
  children: React.ReactNode;
  className?: string;
}

export function ListFiltersPanel({
  toolbar,
  savedFilters,
  resultCount,
  onClear,
  showClear = false,
  clearLabel = "Clear filters",
  gridClassName,
  children,
  className,
}: ListFiltersPanelProps) {
  return (
    <section className={cn("list-filters-panel", className)}>
      <div className="list-filters-panel__accent" aria-hidden />
      <div className="list-filters-panel__body">
        {(toolbar || savedFilters || resultCount || showClear) && (
          <div className="list-filters-panel__toolbar">
            <div className="list-filters-panel__toolbar-start">
              {toolbar}
              {toolbar && savedFilters && (
                <span className="list-filters-panel__divider" aria-hidden />
              )}
              {savedFilters}
            </div>
            <div className="list-filters-panel__toolbar-end">
              {showClear && onClear && (
                <button type="button" onClick={onClear} className="list-filters-panel__clear">
                  {clearLabel}
                </button>
              )}
              {resultCount}
            </div>
          </div>
        )}
        <div className={cn("list-filters-panel__grid", gridClassName)}>{children}</div>
      </div>
    </section>
  );
}
