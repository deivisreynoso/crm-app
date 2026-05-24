import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import {
  OfferOutcomesSection,
  PackageCard,
} from "@/components/website/website-home-sections";
import { SubtleCta } from "@/components/website/subtle-cta";
import { getDictionary, isLocale, type Locale } from "@/lib/website/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.pages.offers.title,
    description: dict.pages.offers.description,
  };
}

export default async function OffersPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="py-16 sm:py-24 bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Link
          href={`/${lang}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--primary)]"
        >
          ← {lang === "es" ? "Inicio" : "Home"}
        </Link>
        <div className="text-center max-w-2xl mx-auto mt-6 mb-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
            {dict.offers.sectionTitle}
          </h1>
          <p className="mt-4 text-body-muted text-lg">{dict.offers.sectionSubtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {dict.offers.packages.map((pkg) => (
            <PackageCard key={pkg.label} lang={lang as Locale} dict={dict} pkg={pkg} />
          ))}
        </div>

        <OfferOutcomesSection dict={dict} />

        <article className="mt-8 rounded-3xl border border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)] p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-[var(--accent)]/15 flex items-center justify-center text-[var(--primary)]">
            <Phone className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                {dict.offers.voice.subtitle}
              </p>
              <h2 className="text-xl font-bold text-heading mt-1">{dict.offers.voice.title}</h2>
            </div>
            <p className="text-sm text-body-muted leading-relaxed">{dict.offers.voice.desc}</p>
            <ul className="flex flex-wrap gap-2">
              {dict.offers.voice.bullets.map((b) => (
                <li
                  key={b}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--card-border)] text-heading"
                >
                  {b}
                </li>
              ))}
            </ul>
            <SubtleCta lang={lang as Locale} variant="book" label={dict.ctaSubtle.book} />
          </div>
        </article>
      </div>
    </div>
  );
}
