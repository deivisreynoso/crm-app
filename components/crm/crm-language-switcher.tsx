"use client";

import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import type { CrmLocale } from "@/lib/crm/i18n";

export function CrmLanguageSwitcher() {
  const { locale, setLocale } = useCrmLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as CrmLocale)}
      className="text-sm border border-[var(--card-border)] rounded-md px-2 py-1.5 bg-[var(--card)] text-[var(--foreground)]"
      aria-label="Platform language"
    >
      <option value="en">EN</option>
      <option value="es">ES</option>
    </select>
  );
}
