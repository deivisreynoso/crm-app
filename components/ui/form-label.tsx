import { cn } from "@/lib/utils";

export function FormLabel({
  children,
  required,
  htmlFor,
  className,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  hint?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-heading mb-1", className)}
    >
      {children}
      {required && (
        <span className="text-[var(--error)] ml-0.5" aria-hidden>
          *
        </span>
      )}
      {hint && !required && (
        <span className="text-body-muted font-normal ml-1">({hint})</span>
      )}
    </label>
  );
}

export function RequiredHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-body-muted mt-1">
      <span className="text-[var(--error)]">*</span> {children}
    </p>
  );
}
