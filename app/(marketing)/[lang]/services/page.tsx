import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Smartphone,
  Globe,
  Database,
  Workflow,
  Check,
} from "lucide-react";
import { ServicesPageCtas } from "@/components/website/services-page-ctas";
import { ServiceCard } from "@/components/website/service-card";
import { getDictionary, isLocale, type Locale } from "@/lib/website/i18n";

type Props = { params: Promise<{ lang: string }> };

const icons = [Smartphone, Globe, Database, Workflow];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.pages.services.title,
    description: dict.pages.services.description,
  };
}

export default async function ServicesPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const s = dict.servicesPage;

  return (
    <>
      <section className="website-hero-glow text-white py-16 sm:py-22">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <span className="website-pill bg-white/15 border-white/30 text-white inline-flex">
            {s.badge}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-[family-name:var(--font-heading)]">
            {s.title}
          </h1>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            {s.subtitle}
          </p>
          <ServicesPageCtas
            lang={lang as Locale}
            ctaPrimary={s.ctaPrimary}
            ctaSecondary={s.ctaSecondary}
            variant="hero"
          />
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {s.items.map((item, i) => {
              const Icon = icons[i] ?? Workflow;
              return (
                <ServiceCard key={item.title} title={item.title}>
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-heading font-[family-name:var(--font-heading)]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-body-muted text-sm leading-relaxed">
                    {item.summary}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {item.points.map((p) => (
                      <li key={p} className="flex gap-2 text-sm text-body-muted">
                        <Check className="w-4 h-4 shrink-0 text-[var(--secondary)] mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </ServiceCard>
              );
            })}
          </div>

          <div className="mt-14 rounded-3xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-8 sm:p-10 text-center">
            <h3 className="text-2xl font-bold text-heading font-[family-name:var(--font-heading)]">
              {s.outroTitle}
            </h3>
            <p className="mt-3 text-body-muted max-w-xl mx-auto">{s.outroBody}</p>
            <ServicesPageCtas
              lang={lang as Locale}
              ctaPrimary={s.ctaPrimary}
              ctaSecondary={s.ctaSecondary}
              variant="outro"
            />
          </div>
        </div>
      </section>
    </>
  );
}
