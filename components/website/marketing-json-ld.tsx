import {
  organizationJsonLd,
  webSiteJsonLd,
} from "@/lib/website/marketing-seo";
import type { Locale } from "@/lib/website/i18n";

export function MarketingJsonLd({ lang }: { lang: Locale }) {
  const blocks = [organizationJsonLd(), webSiteJsonLd(lang)];
  return (
    <>
      {blocks.map((block) => (
        <script
          key={block["@type"] as string}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
