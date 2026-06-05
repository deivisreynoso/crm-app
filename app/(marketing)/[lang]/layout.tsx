import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../marketing.css";
import { WebsiteFooter } from "@/components/website/website-footer";
import { WebsiteHeader } from "@/components/website/website-header";
import { WebsiteChatShell } from "@/components/website/website-chat-shell";
import { GoogleAnalytics } from "@/components/website/google-analytics";
import { CookieConsentBanner } from "@/components/website/cookie-consent-banner";
import { getDictionary, isLocale, type Locale } from "@/lib/website/i18n";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
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
      <WebsiteHeader lang={lang as Locale} dict={dict} />
      <main className="flex-1">{children}</main>
      <WebsiteFooter lang={lang as Locale} dict={dict} />
      <WebsiteChatShell lang={lang as Locale} ctaText={dict.chat.title} />
      <GoogleAnalytics />
      <CookieConsentBanner lang={lang as Locale} copy={dict.cookies} />
    </div>
  );
}
