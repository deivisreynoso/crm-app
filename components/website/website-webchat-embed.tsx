"use client";

import { useEffect, useRef } from "react";
import { ChatWidget } from "@/components/website/chat-widget";
import type { Locale, WebsiteDictionary } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  dict: WebsiteDictionary;
};

/**
 * Inline chat panel for #chat sections. Falls back to N8N iframe/script when env URLs are set.
 *
 * Env:
 * - NEXT_PUBLIC_N8N_WEBCHAT_EMBED_URL — iframe src (overrides built-in widget)
 * - NEXT_PUBLIC_N8N_WEBCHAT_SCRIPT_URL — optional script tag for custom widgets
 */
export function WebsiteWebchatEmbed({ lang, dict }: Props) {
  const scriptHostRef = useRef<HTMLDivElement>(null);
  const embedUrl = process.env.NEXT_PUBLIC_N8N_WEBCHAT_EMBED_URL?.trim();
  const scriptUrl = process.env.NEXT_PUBLIC_N8N_WEBCHAT_SCRIPT_URL?.trim();

  useEffect(() => {
    if (!scriptUrl || !scriptHostRef.current) return;

    const existing = document.querySelector(`script[data-n8n-webchat="${scriptUrl}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.dataset.n8nWebchat = scriptUrl;
    scriptHostRef.current.appendChild(script);

    return () => {
      script.remove();
    };
  }, [scriptUrl]);

  if (embedUrl) {
    return (
      <iframe
        title={dict.chat.title}
        src={embedUrl}
        className="w-full min-h-[420px] sm:min-h-[480px] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-sm)]"
      />
    );
  }

  if (scriptUrl) {
    return (
      <div
        ref={scriptHostRef}
        className="w-full min-h-[420px] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-sm)] flex items-center justify-center p-6"
        aria-busy="true"
        aria-label={dict.chat.title}
      >
        <p className="text-sm text-body-muted">{dict.chat.embedLoading}</p>
      </div>
    );
  }

  return (
    <ChatWidget
      variant="inline"
      locale={lang}
      ctaText={dict.chat.title}
      className="w-full"
    />
  );
}
