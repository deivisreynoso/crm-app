import { cn } from "@/lib/utils";

type FormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
};

/** Branded form section — accent bar + card, consistent across quotes and invoices. */
export function FormSection({ title, description, children, className, id }: FormSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "surface-card overflow-hidden border border-[var(--card-border)]",
        className
      )}
    >
      <div className="border-l-4 border-[var(--secondary)] bg-[var(--surface-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
        {description && (
          <p className="text-xs text-body-muted mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}
