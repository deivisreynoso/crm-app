"use client";

import { usePathname } from "next/navigation";
import { ChatWidget } from "@/components/website/chat-widget";
import type { Locale } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  ctaText?: string;
};

/** Site-wide floating chat — hidden on contact (inline chat only). */
export function WebsiteChatShell({ lang, ctaText }: Props) {
  const pathname = usePathname();
  if (pathname.includes("/contact")) {
    return null;
  }

  return (
    <ChatWidget
      variant="floating"
      locale={lang}
      ctaText={ctaText}
    />
  );
}
