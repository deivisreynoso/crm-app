"use client";

import Link from "next/link";
import { QuoteServicesCatalog } from "@/components/services/quote-services-catalog";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

/** Admin settings shortcut — full catalog also lives under Tools → Services */
export function QuoteServicesSettings() {
  const { dict } = useCrmLocale();
  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        {dict.settings?.quoteServicesSettingsHelp ??
          "Owners and admins can edit prices and remove services. Sales can manage the catalog from Tools → Services."}
      </p>
      <Link href="/services" className="text-sm text-[var(--primary)] hover:underline">
        {dict.settings?.openCatalog ?? "Open Services"}
      </Link>
      <QuoteServicesCatalog canManageCatalog />
    </div>
  );
}
