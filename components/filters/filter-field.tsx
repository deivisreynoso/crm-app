import { cn } from "@/lib/utils";

interface FilterFieldProps {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function FilterField({
  label,
  htmlFor,
  className,
  children,
}: FilterFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1.5 block"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
