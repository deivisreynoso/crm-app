import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/website/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.pages.privacy.title,
    description: dict.pages.privacy.description,
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const p = dict.privacyPage;

  return (
    <div className="py-16 sm:py-24 bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href={`/${lang}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--primary)]"
        >
          ← {lang === "es" ? "Inicio" : "Home"}
        </Link>

        <header className="mt-6 border-b border-[var(--card-border)] pb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-heading font-[family-name:var(--font-heading)]">
            {p.title}
          </h1>
          <p className="mt-3 text-body-muted leading-relaxed">{p.intro}</p>
          <p className="mt-4 text-sm text-body-muted">
            {p.lastUpdatedLabel}: {p.lastUpdated}
          </p>
        </header>

        <div className="mt-10 space-y-10">
          {p.sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-lg font-semibold text-heading">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm text-body-muted leading-relaxed">
                {section.paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
                {section.list && section.list.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1.5">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-body-muted border-t border-[var(--card-border)] pt-8">
          {p.contactNote}{" "}
          <a
            href={`mailto:${p.contactEmail}`}
            className="text-[var(--primary)] hover:underline font-medium"
          >
            {p.contactEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
