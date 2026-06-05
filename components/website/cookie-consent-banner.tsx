"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
} from "@/lib/website/analytics-consent";
import type { Locale } from "@/lib/website/i18n";

type CookieCopy = {
  title: string;
  description: string;
  accept: string;
  decline: string;
  privacyLink: string;
};

export function CookieConsentBanner({
  lang,
  copy,
}: {
  lang: Locale;
  copy: CookieCopy;
}) {
  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" && getAnalyticsConsent() === null
  );

  if (!visible) return null;

  function accept() {
    grantAnalyticsConsent();
    setVisible(false);
  }

  function decline() {
    denyAnalyticsConsent();
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--card-border)] bg-[var(--card)]/95 backdrop-blur-sm shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1">
          <p
            id="cookie-consent-title"
            className="text-sm font-semibold text-heading"
          >
            {copy.title}
          </p>
          <p className="mt-1 text-sm text-body-muted leading-relaxed">
            {copy.description}{" "}
            <Link
              href={`/${lang}/privacy#cookies`}
              className="text-[var(--primary)] underline underline-offset-2 hover:opacity-80"
            >
              {copy.privacyLink}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={decline}>
            {copy.decline}
          </Button>
          <Button type="button" size="sm" onClick={accept}>
            {copy.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
