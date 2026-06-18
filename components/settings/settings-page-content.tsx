"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-shell";
import { CustomFieldManager } from "@/components/custom-fields/custom-field-manager";
import { EmailTemplatesManager } from "@/components/settings/email-templates-manager";
import { DuplicateReviewsPanel } from "@/components/settings/duplicate-reviews-panel";
import { GoogleWorkspacePanel } from "@/components/settings/google-workspace-panel";
import { TeamSettings } from "@/components/settings/team-settings";
import { RolePermissionsMatrix } from "@/components/settings/role-permissions-matrix";
import { PermissionsAdminPanel } from "@/components/settings/permissions-admin-panel";
import { WorkspaceLeadsSettings } from "@/components/settings/workspace-leads-settings";
import { BookingAvailabilitySettings } from "@/components/settings/booking-availability-settings";
import { GoogleReviewRequestSettings } from "@/components/settings/google-review-request-settings";
import { AuditLogsPanel } from "@/components/settings/audit-logs-panel";
import { AutomationsSettingsSection } from "@/components/settings/automations-settings";
import { AdminIntegrationsPanel } from "@/components/settings/admin-integrations-panel";
import { FinanceSettingsPanel } from "@/components/settings/finance-settings-panel";
import { SupportWidgetSettings } from "@/components/settings/support-widget-settings";
import { SettingsSection } from "@/components/settings/settings-section";
import { CrmLanguageSwitcher } from "@/components/crm/crm-language-switcher";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "users" | "integrations" | "data";

const TABS: { id: SettingsTab; label: string; adminOnly?: boolean }[] = [
  { id: "general", label: "General" },
  { id: "users", label: "Users & Roles", adminOnly: true },
  { id: "integrations", label: "Integrations", adminOnly: true },
  { id: "data", label: "Data & Compliance", adminOnly: true },
];

export function SettingsPageContent() {
  const { dict } = useCrmLocale();
  const { data: ctx, isLoading } = useWorkspaceContext();
  const canManage = ctx?.canManage ?? false;
  const s = dict.settings;
  const [tab, setTab] = useState<SettingsTab>("general");

  const visibleTabs = TABS.filter((t) => !t.adminOnly || canManage);

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-4xl">
        <PageHeader title={s?.pageTitle ?? "Settings"} description={s?.loading ?? "Loading…"} />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <PageHeader
        title={s?.pageTitle ?? "Settings"}
        description={
          canManage ? s?.pageDescriptionManage : s?.pageDescriptionMember
        }
      />

      {visibleTabs.length > 1 && (
        <nav
          className="flex flex-wrap gap-1 border-b border-[var(--card-border)] pb-1"
          aria-label="Settings sections"
        >
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-body-muted hover:text-heading"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {tab === "general" && (
        <>
          <SettingsSection title={s?.emailTemplates ?? "Email templates"}>
            <EmailTemplatesManager />
          </SettingsSection>

          <SettingsSection
            title={dict.settings?.reviewRequests ?? "Google review invitations"}
            description={dict.settings?.reviewRequestsHelp}
          >
            <GoogleReviewRequestSettings />
          </SettingsSection>

          <SettingsSection title={s?.bookingAvailability ?? "Booking availability"}>
            <BookingAvailabilitySettings />
          </SettingsSection>

          <SettingsSection
            title="Integrations"
            description="Connect your Google Workspace mailbox and calendar. Each teammate uses their own credentials."
          >
            <GoogleWorkspacePanel />
          </SettingsSection>

          {canManage && (
            <SettingsSection
              title={s?.language ?? "Platform language"}
              description={s?.languageHelp ?? "Applies to CRM navigation and common labels."}
            >
              <CrmLanguageSwitcher />
            </SettingsSection>
          )}
        </>
      )}

      {tab === "users" && canManage && (
        <>
          <SettingsSection
            title="Role permissions"
            description="What each teammate role can do in this workspace."
          >
            <RolePermissionsMatrix />
          </SettingsSection>

          <SettingsSection
            title="Custom roles & permission sets"
            description="Salesforce-style access control: clone a standard role or stack permission sets on teammates."
          >
            <PermissionsAdminPanel />
          </SettingsSection>

          <SettingsSection title={s?.team ?? "Team"}>
            <TeamSettings />
          </SettingsSection>
        </>
      )}

      {tab === "integrations" && canManage && (
        <>
          <SettingsSection
            title="Finances"
            description="Default currency, invoice numbering, categories, and Stripe status."
          >
            <FinanceSettingsPanel />
          </SettingsSection>

          <SettingsSection
            title="Admin integrations"
            description="N8N, Stripe, Mailgun, and Google Analytics configuration status."
          >
            <AdminIntegrationsPanel />
          </SettingsSection>

          <SettingsSection
            title="Support widget"
            description="Public customer support page and embed code."
          >
            <SupportWidgetSettings />
          </SettingsSection>

          <SettingsSection
            title={s?.websiteLeads ?? "Website leads"}
            description="Default assignee for inbound website leads."
          >
            <WorkspaceLeadsSettings />
          </SettingsSection>

          <SettingsSection
            title="Automations"
            description="Outbound webhooks, onboarding, appointment reminders, quote expiry, and session timeout."
          >
            <AutomationsSettingsSection />
          </SettingsSection>
        </>
      )}

      {tab === "data" && canManage && (
        <>
          <SettingsSection title={s?.duplicateContacts ?? "Duplicate contacts"}>
            <DuplicateReviewsPanel />
          </SettingsSection>

          <SettingsSection title={s?.auditLogs ?? "Audit log"}>
            <AuditLogsPanel />
          </SettingsSection>

          <SettingsSection
            title={s?.customFields ?? "Custom fields"}
            description={s?.customFieldsHelp}
          >
            <CustomFieldManager />
          </SettingsSection>
        </>
      )}
    </div>
  );
}
