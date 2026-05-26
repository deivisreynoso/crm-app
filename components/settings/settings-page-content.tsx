"use client";

import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { CustomFieldManager } from "@/components/custom-fields/custom-field-manager";
import { EmailTemplatesManager } from "@/components/settings/email-templates-manager";
import { DuplicateReviewsPanel } from "@/components/settings/duplicate-reviews-panel";
import { SettingsIntegrationsSection } from "@/components/settings/settings-integrations-section";
import { GoogleWorkspaceSetup } from "@/components/settings/google-workspace-setup";
import { TeamSettings } from "@/components/settings/team-settings";
import { WorkspaceLeadsSettings } from "@/components/settings/workspace-leads-settings";
import { BookingAvailabilitySettings } from "@/components/settings/booking-availability-settings";
import { QuoteServicesSettings } from "@/components/settings/quote-services-settings";
import { QuoteBrandingSettings } from "@/components/settings/quote-branding-settings";
import { GoogleReviewRequestSettings } from "@/components/settings/google-review-request-settings";
import { CrmLanguageSwitcher } from "@/components/crm/crm-language-switcher";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";

function LanguageSettingsCard() {
  const { dict } = useCrmLocale();
  return (
    <Card padding="lg">
      <h2 className="text-sm font-semibold text-heading mb-1">
        {dict.settings?.language ?? "Platform language"}
      </h2>
      <p className="text-sm text-body-muted mb-4">
        {dict.settings?.languageHelp ??
          "Applies to CRM navigation and common labels."}
      </p>
      <CrmLanguageSwitcher />
    </Card>
  );
}

export function SettingsPageContent() {
  const { dict } = useCrmLocale();
  const { data: ctx, isLoading } = useWorkspaceContext();
  const canManage = ctx?.canManage ?? false;

  const s = dict.settings;

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-3xl">
        <PageHeader
          title={s?.pageTitle ?? "Settings"}
          description={s?.loading ?? "Loading workspace…"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title={s?.pageTitle ?? "Settings"}
        description={
          canManage
            ? s?.pageDescriptionManage
            : s?.pageDescriptionMember
        }
      />

      <LanguageSettingsCard />

      <Card padding="lg">
        <GoogleWorkspaceSetup />
      </Card>

      {canManage && (
        <>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-2">
              {dict.settings?.quoteBranding ?? "Quote branding"}
            </h2>
            <QuoteBrandingSettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">
              {s?.quoteServices ?? "Quote services catalog"}
            </h2>
            <QuoteServicesSettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">
              {s?.bookingAvailability ?? "Booking availability"}
            </h2>
            <BookingAvailabilitySettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Website leads</h2>
            <WorkspaceLeadsSettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">
              {s?.integrations ?? "Integrations"}
            </h2>
            <SettingsIntegrationsSection />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-2">
              {dict.settings?.reviewRequests ?? "Google review invitations"}
            </h2>
            <GoogleReviewRequestSettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">
              {s?.emailTemplates ?? "Email templates"}
            </h2>
            <EmailTemplatesManager />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Duplicate contacts</h2>
            <DuplicateReviewsPanel />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">
              {s?.team ?? "Team"}
            </h2>
            <TeamSettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">
              {s?.customFields ?? "Custom fields"}
            </h2>
            <p className="text-sm text-body-muted mb-4">
              {s?.customFieldsHelp ??
                "Define extra fields for contacts, opportunities, and tickets."}
            </p>
            <CustomFieldManager />
          </Card>
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
