import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../marketing.css";
import { WebsiteFooter } from "@/components/website/website-footer";
import { WebsiteHeader } from "@/components/website/website-header";
import { WebsiteChatShell } from "@/components/website/website-chat-shell";
import { ScrollDepthTracker } from "@/components/analytics/scroll-depth-tracker";
import { GoogleAnalytics } from "@/components/website/google-analytics";
import { CookieConsentBanner } from "@/components/website/cookie-consent-banner";
import { MarketingJsonLd } from "@/components/website/marketing-json-ld";
import { getDictionary, isLocale, type Locale } from "@/lib/website/i18n";
import { buildMarketingMetadata } from "@/lib/website/marketing-seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return buildMarketingMetadata({
    lang,
    title: dict.meta.title,
    description: dict.meta.description,
  });
}

export default async function MarketingLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <div
      lang={lang}
      className="marketing-site min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] light"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--primary)] focus:text-white"
      >
        {lang === "es" ? "Saltar al contenido" : "Skip to main content"}
      </a>
      <WebsiteHeader lang={lang as Locale} dict={dict} />
      <main id="main-content" className="flex-1">{children}</main>
      <WebsiteFooter lang={lang as Locale} dict={dict} />
      <WebsiteChatShell lang={lang as Locale} ctaText={dict.chat.title} />
      <MarketingJsonLd lang={lang as Locale} />
      <GoogleAnalytics />
      <ScrollDepthTracker />
      <CookieConsentBanner lang={lang as Locale} copy={dict.cookies} />
    </div>
  );
}
