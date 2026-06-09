"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-shell";
import { QuoteServicesCatalog } from "@/components/services/quote-services-catalog";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

export default function ServicesPage() {
  const { dict } = useCrmLocale();
  const s = dict.services;
  const { canWrite, canManage, isLoading } = useWorkspaceCapabilities();

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-3xl">
        <PageHeader title={s?.title ?? "Product Catalog"} description={s?.loading} />
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="space-y-6 w-full max-w-3xl">
        <PageHeader title={s?.title ?? "Product Catalog"} description={s?.description} />
        <p className="text-sm text-body-muted">
          {s?.viewerNotice ??
            "Your account has view-only access. Product catalog is not available in demo mode."}
        </p>
        <Link
          href="/quotes"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← {dict.quotes?.title ?? "Quotes"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader title={s?.title ?? "Product Catalog"} description={s?.description} />
      <div className="surface-card p-6">
        <QuoteServicesCatalog canManageCatalog={canManage} />
      </div>
    </div>
  );
}
