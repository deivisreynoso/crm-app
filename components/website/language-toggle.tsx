"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/website/i18n";

type Props = { lang: Locale };

/** Mexico — Spanish (Americas) */
function FlagMexico({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#006847" rx="2" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#CE1126" rx="0 2 2 0" />
      <circle cx="12" cy="8" r="2.2" fill="#C6922B" opacity="0.9" />
    </svg>
  );
}

/** United States — English (Americas) */
function FlagUSA({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#B22234" rx="2" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={i * 2.3} width="24" height="1.15" fill={i % 2 === 0 ? "#fff" : "transparent"} />
      ))}
      <rect width="10" height="9" fill="#3C3B6E" rx="2 0 0 0" />
    </svg>
  );
}

/** Shows the flag of the language you can switch TO. */
export function LanguageToggle({ lang }: Props) {
  const pathname = usePathname();
  const targetLang: Locale = lang === "es" ? "en" : "es";
  const switchPath = pathname?.replace(`/${lang}`, `/${targetLang}`) ?? `/${targetLang}`;
  const label =
    targetLang === "en" ? "English (United States)" : "Español (México)";

  return (
    <Link
      href={switchPath}
      className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--secondary)] hover:shadow-[var(--shadow-sm)] transition-all"
      aria-label={label}
      title={label}
    >
      {targetLang === "en" ? (
        <FlagUSA className="w-6 h-4 rounded-sm shadow-sm" />
      ) : (
        <FlagMexico className="w-6 h-4 rounded-sm shadow-sm" />
      )}
    </Link>
  );
}
