"use client";

import { Copy, Mail, Phone } from "lucide-react";
import { useCopyToast } from "@/components/ui/copy-toast";
import { cn } from "@/lib/utils";

interface QuickActionButtonsProps {
  email?: string | null;
  phone?: string | null;
  className?: string;
}

export function QuickActionButtons({
  email,
  phone,
  className,
}: QuickActionButtonsProps) {
  const { showCopied, toast: copyToast } = useCopyToast();

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showCopied("Copied");
    } catch {
      showCopied("Copy failed");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {phone?.trim() && (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-heading hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          <Phone className="h-4 w-4" strokeWidth={1.75} />
          Call
        </a>
      )}
      {email?.trim() && (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-heading hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} />
          Email
        </a>
      )}
      {email?.trim() && (
        <button
          type="button"
          onClick={() => void copyText(email)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-heading hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          <Copy className="h-4 w-4" strokeWidth={1.75} />
          Copy email
        </button>
      )}
      {phone?.trim() && (
        <button
          type="button"
          onClick={() => void copyText(phone)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-heading hover:bg-[var(--sidebar-hover)] transition-colors"
        >
          <Copy className="h-4 w-4" strokeWidth={1.75} />
          Copy phone
        </button>
      )}
      {copyToast}
    </div>
  );
}
