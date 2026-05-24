import { notFound } from "next/navigation";
import { WebsiteBookingForm } from "@/components/website/website-booking-form";
import { getDictionary, isLocale } from "@/lib/website/i18n";

type Props = { params: Promise<{ lang: string }> };

export default async function BookCallPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="py-12 sm:py-20 bg-[var(--surface-subtle)] min-h-[60vh]">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-md)] p-6 sm:p-10">
          <span className="website-pill mb-4 inline-flex">ClickIn 360</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-heading font-[family-name:var(--font-heading)] mb-2">
            {dict.cta.book}
          </h1>
          <p className="text-body-muted mb-8">{dict.cta.subtitle}</p>
          <WebsiteBookingForm lang={lang} />
        </div>
      </div>
    </div>
  );
}
