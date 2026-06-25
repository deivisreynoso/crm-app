"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TransactionsTab } from "@/components/finances/transactions-tab";

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const filters =
    type === "expense" || type === "income"
      ? { type: type as "expense" | "income" }
      : undefined;

  return (
    <div className="space-y-3">
      {type === "expense" && (
        <p className="text-sm text-body-muted">
          Showing expenses only. Use{" "}
          <Link href="/finances/transactions" className="text-[var(--secondary)] hover:underline">
            all transactions
          </Link>{" "}
          for income and expenses together.
        </p>
      )}
      <TransactionsTab filters={filters} />
    </div>
  );
}

export default function FinancesTransactionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-body-muted">Loading…</p>}>
      <TransactionsPageContent />
    </Suspense>
  );
}
