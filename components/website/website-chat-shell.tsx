"use client";

import { ChatWidget } from "@/components/website/chat-widget";
import type { Locale } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  ctaText?: string;
};

/** Site-wide floating chat bubble + overlay on marketing pages. */
export function WebsiteChatShell({ lang, ctaText }: Props) {
  return (
    <ChatWidget
      variant="floating"
      locale={lang}
      ctaText={ctaText}
    />
  );
}
