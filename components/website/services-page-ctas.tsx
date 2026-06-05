"use client";

import { ArrowRight } from "lucide-react";
import { ChatOpenButton } from "@/components/website/chat-open-trigger";
import { TrackedLink } from "@/components/website/tracked-link";
import { ga4Events } from "@/lib/analytics/ga4-events";
import type { Locale } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  ctaPrimary: string;
  ctaSecondary: string;
  variant: "hero" | "outro";
};

export function ServicesPageCtas({
  lang,
  ctaPrimary,
  ctaSecondary,
  variant,
}: Props) {
  const location = variant === "hero" ? "services-hero" : "services-outro";

  if (variant === "hero") {
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <TrackedLink
          href={`/${lang}/book-call`}
          ctaName={ctaPrimary}
          ctaLocation={location}
        >
          <button
            type="button"
            className="website-cta-primary inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-base w-full sm:w-auto"
          >
            {ctaPrimary}
            <ArrowRight className="w-4 h-4" />
          </button>
        </TrackedLink>
        <ChatOpenButton className="website-cta-secondary inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl text-base w-full sm:w-auto">
          {ctaSecondary}
        </ChatOpenButton>
      </div>
    );
  }

  return (
    <TrackedLink
      href={`/${lang}/book-call`}
      className="inline-flex mt-6 items-center gap-2 h-12 px-8 rounded-xl website-cta-primary text-base font-semibold"
      ctaName={ctaPrimary}
      ctaLocation={location}
      onClick={() => ga4Events.serviceViewed("services", "outro")}
    >
      {ctaPrimary}
      <ArrowRight className="w-4 h-4" />
    </TrackedLink>
  );
}
