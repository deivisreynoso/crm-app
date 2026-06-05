import type { MetadataRoute } from "next";
import {
  CRM_ROBOTS_DISALLOW,
  getSiteBaseUrl,
} from "@/lib/website/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/en/", "/es/"],
      disallow: CRM_ROBOTS_DISALLOW,
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
