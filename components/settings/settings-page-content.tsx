"use client";

import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { CustomFieldManager } from "@/components/custom-fields/custom-field-manager";
import { EmailTemplatesManager } from "@/components/settings/email-templates-manager";
import { DuplicateReviewsPanel } from "@/components/settings/duplicate-reviews-panel";
import { GoogleWorkspacePanel } from "@/components/settings/google-workspace-panel";
import { TeamSettings } from "@/components/settings/team-settings";
import { WorkspaceLeadsSettings } from "@/components/settings/workspace-leads-settings";
import { BookingAvailabilitySettings } from "@/components/settings/booking-availability-settings";
import { QuoteServicesSettings } from "@/components/settings/quote-services-settings";
import { QuoteBrandingSettings } from "@/components/settings/quote-branding-settings";
import { GoogleReviewRequestSettings } from "@/components/settings/google-review-request-settings";
import { AuditLogsPanel } from "@/components/settings/audit-logs-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { CrmLanguageSwitcher } from "@/components/crm/crm-language-switcher";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";

export function SettingsPageContent() {
  const { dict } = useCrmLocale();
  const { data: ctx, isLoading } = useWorkspaceContext();
  const canManage = ctx?.canManage ?? false;
  const s = dict.settings;

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

      <SettingsSection
        title={s?.language ?? "Platform language"}
        description={
          s?.languageHelp ?? "Applies to CRM navigation and common labels."
        }
      >
        <CrmLanguageSwitcher />
      </SettingsSection>

      <SettingsSection
        title="Integrations"
        description="Connect your Google Workspace mailbox and calendar. Each teammate uses their own credentials."
      >
        <GoogleWorkspacePanel />
      </SettingsSection>

      {canManage && (
        <>
          <SettingsSection
            title={dict.settings?.quoteBranding ?? "Quote branding"}
            description="Logo and company name on quote PDFs."
          >
            <QuoteBrandingSettings />
          </SettingsSection>

          <SettingsSection
            title={s?.quoteServices ?? "Product catalog"}
            description={s?.quoteServicesSettingsHelp}
          >
            <QuoteServicesSettings />
          </SettingsSection>

          <SettingsSection title={s?.bookingAvailability ?? "Booking availability"}>
            <BookingAvailabilitySettings />
          </SettingsSection>

          <SettingsSection
            title={s?.websiteLeads ?? "Website leads"}
            description="Default assignee for inbound website leads."
          >
            <WorkspaceLeadsSettings />
          </SettingsSection>

          <SettingsSection
            title={dict.settings?.reviewRequests ?? "Google review invitations"}
            description={dict.settings?.reviewRequestsHelp}
          >
            <GoogleReviewRequestSettings />
          </SettingsSection>

          <SettingsSection title={s?.emailTemplates ?? "Email templates"}>
            <EmailTemplatesManager />
          </SettingsSection>

          <SettingsSection title={s?.duplicateContacts ?? "Duplicate contacts"}>
            <DuplicateReviewsPanel />
          </SettingsSection>

          <SettingsSection title={s?.team ?? "Team"}>
            <TeamSettings />
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

      {!canManage && (
        <Card padding="lg">
          <p className="text-sm text-body-muted">
            {(
              s?.memberNotice ??
              "You are signed in as a workspace teammate ({role}). CRM data is shared with your team. Workspace settings are managed by the owner or an admin."
            ).replace("{role}", ctx?.role ?? "sales")}
          </p>
        </Card>
      )}
    </div>
  );
}
