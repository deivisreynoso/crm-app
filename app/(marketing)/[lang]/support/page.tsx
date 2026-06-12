import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { PublicSupportWidget } from "@/components/support/public-support-widget";
import { getDictionary, isLocale } from "@/lib/website/i18n";
import { isSupportWidgetEnabled } from "@/lib/support/widget-status";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.support.metaTitle,
    description: dict.support.metaDescription,
  };
}

export default async function SupportPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const enabled = await isSupportWidgetEnabled();

  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <Link
            href={`/${lang}`}
            className="text-sm text-[var(--muted)] hover:text-[var(--primary)]"
          >
            ← {lang === "es" ? "Inicio" : "Home"}
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--secondary)]/20 flex items-center justify-center text-[var(--primary)]">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-heading">
                {dict.support.title}
              </h1>
              <p className="text-sm text-body-muted mt-1">{dict.support.subtitle}</p>
            </div>
          </div>
        </div>

        <PublicSupportWidget
          enabled={enabled}
          disabledMessage={dict.support.disabled}
          locale={lang}
          labels={dict.support.form}
        />
      </div>
    </div>
  );
}
