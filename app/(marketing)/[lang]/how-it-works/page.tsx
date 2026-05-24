import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MessageCircle,
  Zap,
  Database,
  Bot,
  Headphones,
  Workflow,
} from "lucide-react";
import { SubtleCta } from "@/components/website/subtle-cta";
import { getDictionary, isLocale, type Locale } from "@/lib/website/i18n";

type Props = { params: Promise<{ lang: string }> };

const stepIcons = [MessageCircle, Zap, Database, Bot, Headphones];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.pages.howItWorks.title,
    description: dict.pages.howItWorks.description,
  };
}

export default async function HowItWorksPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="py-16 sm:py-24 website-dot-grid bg-[var(--surface-subtle)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Link
          href={`/${lang}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--primary)]"
        >
          ← {lang === "es" ? "Inicio" : "Home"}
        </Link>
        <div className="text-center max-w-2xl mx-auto mt-6 mb-14">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] mb-4">
            <Workflow className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
            {dict.solution.title}
          </h1>
          <p className="mt-4 text-body-muted text-lg">{dict.solution.subtitle}</p>
        </div>

        <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {dict.solution.steps.map((step, i) => {
            const Icon = stepIcons[i] ?? Workflow;
            return (
              <li
                key={step.title}
                className="website-card-lift relative rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="absolute top-4 right-4 text-2xl font-bold text-[var(--secondary)]/30">
                  {i + 1}
                </span>
                <h2 className="font-semibold text-heading text-sm mb-2">{step.title}</h2>
                <p className="text-xs text-body-muted leading-relaxed">{step.desc}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <SubtleCta lang={lang as Locale} variant="book" label={dict.ctaSubtle.book} />
          <SubtleCta lang={lang as Locale} variant="chat" label={dict.ctaSubtle.chat} />
        </div>
      </div>
    </div>
  );
}
