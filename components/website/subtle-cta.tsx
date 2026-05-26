"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ChatOpenButton } from "@/components/website/chat-open-trigger";
import type { Locale } from "@/lib/website/i18n";

type Variant = "book" | "chat";

type Props = {
  lang: Locale;
  variant: Variant;
  label: string;
  className?: string;
};

export function SubtleCta({ lang, variant, label, className = "" }: Props) {
  const Icon = variant === "book" ? ArrowRight : MessageCircle;
  const linkClass = `website-link group inline-flex items-center gap-1.5 text-sm font-medium hover:text-[var(--primary)] transition-colors ${className}`;

  if (variant === "chat") {
    return (
      <ChatOpenButton className={linkClass}>
        {label}
        <Icon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </ChatOpenButton>
    );
  }

  return (
    <Link href={`/${lang}/book-call`} className={linkClass}>
      {label}
      <Icon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
