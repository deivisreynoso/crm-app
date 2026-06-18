import type { Metadata } from "next";
import { getSiteBaseUrl, MARKETING_PAGE_SLUGS } from "@/lib/website/site-url";
import type { Locale } from "@/lib/website/i18n";

const LOCALES: Locale[] = ["en", "es"];

export function marketingAlternates(pathAfterLang = "") {
  const base = getSiteBaseUrl();
  const suffix = pathAfterLang ? `/${pathAfterLang.replace(/^\//, "")}` : "";
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${base}/${locale}${suffix}`;
  }
  languages["x-default"] = `${base}/en${suffix}`;
  return { languages };
}

export function buildMarketingMetadata({
  lang,
  title,
  description,
  pathAfterLang = "",
  imagePath = "/brand/og-default.png",
}: {
  lang: Locale;
  title: string;
  description: string;
  pathAfterLang?: string;
  imagePath?: string;
}): Metadata {
  const base = getSiteBaseUrl();
  const suffix = pathAfterLang ? `/${pathAfterLang.replace(/^\//, "")}` : "";
  const url = `${base}/${lang}${suffix}`;
  const imageUrl = imagePath.startsWith("http") ? imagePath : `${base}${imagePath}`;

  return {
    title,
    description,
    alternates: marketingAlternates(pathAfterLang),
    openGraph: {
      type: "website",
      locale: lang === "es" ? "es_MX" : "en_US",
      url,
      title,
      description,
      siteName: "ClickIn 360",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function organizationJsonLd() {
  const base = getSiteBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ClickIn 360",
    url: base,
    logo: `${base}/brand/logo-light.png`,
    sameAs: ["https://www.linkedin.com/company/clickin360"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "sales@clickin360.com",
      availableLanguage: ["English", "Spanish"],
    },
  };
}

export function webSiteJsonLd(lang: Locale) {
  const base = getSiteBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ClickIn 360",
    url: `${base}/${lang}`,
    inLanguage: lang === "es" ? "es-MX" : "en-US",
  };
}

export const MARKETING_SITEMAP_SLUGS = MARKETING_PAGE_SLUGS;
