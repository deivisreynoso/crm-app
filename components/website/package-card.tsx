"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ga4Events } from "@/lib/analytics/ga4-events";
import { SubtleCta } from "@/components/website/subtle-cta";
import { TrackedLink } from "@/components/website/tracked-link";
import type { Locale, WebsiteDictionary } from "@/lib/website/i18n";

type Package = WebsiteDictionary["offers"]["packages"][number];

export function PackageCard({
  lang,
  dict,
  pkg,
}: {
  lang: Locale;
  dict: WebsiteDictionary;
  pkg: Package;
}) {
  return (
    <article
      className={`website-card-lift flex h-full flex-col overflow-hidden rounded-3xl border shadow-[var(--shadow-md)] ${
        pkg.featured
          ? "border-[var(--secondary)]"
          : "border-[var(--card-border)]"
      } bg-[var(--card)]`}
    >
      {"image" in pkg && pkg.image ? (
        <div className="aspect-[3/2] w-full shrink-0 overflow-hidden bg-[var(--card)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pkg.image.replace(/\.webp(\?.*)?$/, "-400.webp$1")}
            srcSet={`${pkg.image.replace(/\.webp(\?.*)?$/, "-400.webp$1")} 400w, ${pkg.image} 600w`}
            sizes="(max-width: 1024px) 346px, 400px"
            alt=""
            width={600}
            height={400}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-contain object-center"
          />
        </div>
      ) : null}
      <div className="p-6 sm:p-7 flex flex-col flex-1 gap-5">
        <div className="relative">
          {pkg.featured && (
            <span className="absolute -top-1 right-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--secondary)] text-white shadow-sm">
              {dict.offers.featuredBadge}
            </span>
          )}
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            {pkg.label}
          </p>
          <h3 className="text-lg sm:text-xl font-bold text-heading mt-1 leading-snug pr-24">
            {pkg.title}
          </h3>
          <p className="text-sm text-body-muted mt-2 leading-relaxed min-h-[3.5rem]">
            {pkg.tagline}
          </p>
        </div>

        <div className="flex-1 flex flex-col min-h-[14rem]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-heading mb-2">
            {dict.offers.includesTitle}
          </h4>
          <ul className="space-y-1.5 flex-1">
            {pkg.includes.map((item) => (
              <li key={item} className="flex gap-2 text-xs sm:text-sm text-body-muted">
                <Check className="w-4 h-4 shrink-0 text-[var(--secondary)] mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--card-border)] pt-5">
          <SubtleCta lang={lang} variant="book" label={dict.offers.ctaSubtle} />
          <TrackedLink
            href={`/${lang}/book-call`}
            ctaName={dict.offers.cta}
            ctaLocation={`pricing-${pkg.label}`}
            onClick={() => {
              ga4Events.pricingViewed(pkg.label);
              ga4Events.serviceViewed(pkg.title, pkg.label);
            }}
          >
            <Button size="sm" variant={pkg.featured ? "default" : "outline"}>
              {dict.offers.cta}
            </Button>
          </TrackedLink>
        </div>
      </div>
    </article>
  );
}
