"use client";

import Link from "next/link";
import { QuoteServicesCatalog } from "@/components/services/quote-services-catalog";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

/** Admin settings shortcut — full catalog also lives under Tools → Product Catalog */
export function QuoteServicesSettings() {
  const { dict } = useCrmLocale();
  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        {dict.settings?.quoteServicesSettingsHelp ??
          "Owners and admins can edit prices and remove products. Sales can manage the catalog from Tools → Product Catalog."}
      </p>
      <Link href="/services" className="text-sm text-[var(--primary)] hover:underline">
        {dict.settings?.openCatalog ?? "Open Product Catalog"}
      </Link>
      <QuoteServicesCatalog canManageCatalog />
    </div>
  );
}
