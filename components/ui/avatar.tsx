import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  src,
  alt,
  size = "md",
  className,
}: {
  initials: string;
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? initials}
        className={cn(
          "inline-block rounded-full object-cover shrink-0 ring-2 ring-[var(--card)]",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0",
        "bg-[var(--primary)] text-[var(--primary-foreground)] ring-2 ring-[var(--card)]",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
