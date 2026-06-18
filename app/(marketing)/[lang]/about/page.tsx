import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubtleCta } from "@/components/website/subtle-cta";
import { getDictionary, isLocale, type Locale } from "@/lib/website/i18n";
import { buildMarketingMetadata } from "@/lib/website/marketing-seo";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return buildMarketingMetadata({
    lang,
    title: dict.pages.about.title,
    description: dict.pages.about.description,
    pathAfterLang: "about",
  });
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl">
          <Link
            href={`/${lang}`}
            className="text-sm text-[var(--muted)] hover:text-[var(--primary)]"
          >
            ← {lang === "es" ? "Inicio" : "Home"}
          </Link>
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
            {dict.about.title}
          </h1>
          <p className="mt-3 text-lg text-[var(--secondary)] font-medium">{dict.about.subtitle}</p>
        </div>

        <div className="mt-12 grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-4 text-body-muted leading-relaxed">
            {dict.about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <div className="pt-4 flex flex-wrap gap-3">
              <Link href={`/${lang}/book-call`}>
                <Button>{dict.nav.book}</Button>
              </Link>
              <SubtleCta lang={lang as Locale} variant="chat" label={dict.ctaSubtle.chat} />
            </div>
          </div>

          <div className="grid gap-4">
            {dict.about.values.map((v) => (
              <div
                key={v.title}
                className="website-card-lift flex gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[var(--secondary)]/15 flex items-center justify-center text-[var(--primary)]">
                  {v.title.includes("Datos") || v.title.includes("Connected") ? (
                    <Database className="w-5 h-5" />
                  ) : v.title.includes("Canal") || v.title.includes("Channel") ? (
                    <MessageCircle className="w-5 h-5" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-heading">{v.title}</h2>
                  <p className="mt-1 text-sm text-body-muted">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
