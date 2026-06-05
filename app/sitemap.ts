import type { MetadataRoute } from "next";
import {
  getSiteBaseUrl,
  MARKETING_PAGE_SLUGS,
} from "@/lib/website/site-url";

const LOCALES = ["en", "es"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteBaseUrl();
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const lang of LOCALES) {
    entries.push({
      url: `${base}/${lang}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    });

    for (const slug of MARKETING_PAGE_SLUGS) {
      entries.push({
        url: `${base}/${lang}/${slug}`,
        lastModified,
        changeFrequency: slug === "privacy" ? "yearly" : "monthly",
        priority: slug === "contact" || slug === "book-call" ? 0.9 : 0.7,
      });
    }
  }

  return entries;
}
