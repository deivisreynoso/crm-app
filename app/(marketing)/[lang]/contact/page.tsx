import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot } from "lucide-react";
import { WebsiteWebchatEmbed } from "@/components/website/website-webchat-embed";
import { ContactPageCtas } from "@/components/website/contact-page-ctas";
import { getDictionary, isLocale } from "@/lib/website/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: lang === "es" ? "Contacto — ClickIn 360" : "Contact — ClickIn 360",
    description: dict.chat.desc,
  };
}

export default async function ContactPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <Link
            href={`/${lang}`}
            className="text-sm text-[var(--muted)] hover:text-[var(--primary)]"
          >
            ← {lang === "es" ? "Inicio" : "Home"}
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--secondary)]/20 flex items-center justify-center text-[var(--primary)]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-heading">
                {dict.chat.title}
              </h1>
              <p className="text-sm text-body-muted mt-1">{dict.chat.desc}</p>
            </div>
          </div>
        </div>

        <WebsiteWebchatEmbed lang={lang} dict={dict} />

        <ContactPageCtas lang={lang} bookLabel={dict.nav.book} />
      </div>
    </div>
  );
}
