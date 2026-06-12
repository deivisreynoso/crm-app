"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-shell";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

const TABS: Array<{ href: string; label: string; adminOnly?: boolean }> = [
  { href: "/finances/invoices", label: "Invoices" },
  { href: "/finances/transactions", label: "Transactions" },
  { href: "/finances/payment-links", label: "Payment Links" },
];

export default function FinancesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { canManage } = useWorkspaceCapabilities();

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Finances"
        description="Revenue, invoices, payment links, and transactions"
      />

      <nav className="flex flex-wrap gap-4 border-b border-[var(--card-border)]">
        {TABS.filter((t) => !t.adminOnly || canManage).map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-[var(--secondary)] text-[var(--primary)]"
                  : "border-transparent text-body-muted hover:text-heading"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
