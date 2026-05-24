import { notFound } from "next/navigation";
import { WebsiteHomeSections } from "@/components/website/website-home-sections";
import { getDictionary, isLocale } from "@/lib/website/i18n";

type Props = { params: Promise<{ lang: string }> };

export default async function MarketingHomePage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return <WebsiteHomeSections lang={lang} dict={dict} />;
}
