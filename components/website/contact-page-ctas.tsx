"use client";

import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/website/tracked-link";
import type { Locale } from "@/lib/website/i18n";

type Props = {
  lang: Locale;
  bookLabel: string;
};

export function ContactPageCtas({ lang, bookLabel }: Props) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <TrackedLink
        href={`/${lang}/book-call`}
        ctaName={bookLabel}
        ctaLocation="contact-page"
      >
        <Button>{bookLabel}</Button>
      </TrackedLink>
    </div>
  );
}
