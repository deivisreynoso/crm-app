"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RecordSectionTabs } from "@/components/crm/record-section-tabs";
import { AccountOverview, type AccountPatch } from "@/components/accounts/account-overview";
import { EntityRelatedPanel } from "@/components/crm/entity-related-panel";
import {
  useCompany,
  useCompanyRelated,
  useUpdateCompany,
} from "@/hooks/useCompanies";
import { useCreateTicket } from "@/hooks/useTickets";
import { useUploadDocument } from "@/hooks/useDocuments";

type PageProps = { params: Promise<{ id: string }> };
type MobileTab = "details" | "related";

export default function AccountDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [mobileTab, setMobileTab] = useState<MobileTab>("details");

  const { data: account, isLoading } = useCompany(id);
  const { data: related, refetch: refetchRelated } = useCompanyRelated(id);
  const updateCompany = useUpdateCompany(id);
  const createTicket = useCreateTicket();
  const uploadDocument = useUploadDocument();

  async function handleSaveField(patch: AccountPatch) {
    await updateCompany.mutateAsync(patch);
  }

  if (isLoading) return <p className="text-body-muted text-sm">Loading account…</p>;

  if (!account) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--error)]">Account not found.</p>
        <Link href="/accounts" className="text-sm text-[var(--primary)] hover:underline">
          ← Accounts
        </Link>
      </div>
    );
  }

  const detailsPanel = <AccountOverview account={account} onSaveField={handleSaveField} />;

  const relatedPanel = related ? (
    <EntityRelatedPanel
      showAccountContacts
      context={{ companyId: id }}
      contacts={related.contacts}
      opportunities={related.opportunities as never[]}
      tickets={related.tickets as never[]}
      documents={related.documents as never[]}
      calendarEvents={related.calendar_events as never[]}
      onCreateTicket={async (data) => {
        await createTicket.mutateAsync({ ...data, company_id: id });
      }}
      onCreateDocument={async (meta, file) => {
        await uploadDocument.mutateAsync({
          metadata: { ...meta, company_id: id },
          file,
        });
      }}
      ticketLoading={createTicket.isPending}
      documentLoading={uploadDocument.isPending}
      onContactCreated={() => refetchRelated()}
      onOpportunityCreated={() => refetchRelated()}
      onCalendarEventCreated={() => refetchRelated()}
    />
  ) : (
    <p className="text-body-muted text-sm">Loading related records…</p>
  );

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
            <Building2 className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <Link
              href="/accounts"
              className="text-xs text-body-muted hover:text-[var(--primary)]"
            >
              ← All accounts
            </Link>
            <h1 className="text-2xl font-bold text-heading tracking-tight mt-0.5">
              {account.name}
            </h1>
            <p className="text-sm text-body-muted mt-1">
              {[account.industry, account.phone].filter(Boolean).join(" · ") || "Account"}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden xl:grid xl:grid-cols-12 gap-6 items-start">
        <Card className="xl:col-span-5" padding="lg">
          <h2 className="text-sm font-semibold text-heading mb-5">Details</h2>
          {detailsPanel}
        </Card>
        <Card className="xl:col-span-7" padding="lg">
          <h2 className="text-sm font-semibold text-heading mb-5">Related</h2>
          {relatedPanel}
        </Card>
      </div>

      <Card className="xl:hidden" padding="none">
        <div className="px-6 pt-4">
          <RecordSectionTabs
            tabs={[
              { id: "details", label: "Details" },
              { id: "related", label: "Related" },
            ]}
            activeTab={mobileTab}
            onTabChange={(t) => setMobileTab(t as MobileTab)}
          />
        </div>
        <div className="p-6">{mobileTab === "details" ? detailsPanel : relatedPanel}</div>
      </Card>
    </div>
  );
}
