"use client";

import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { CustomFieldManager } from "@/components/custom-fields/custom-field-manager";
import { EmailTemplatesManager } from "@/components/settings/email-templates-manager";
import { DuplicateReviewsPanel } from "@/components/settings/duplicate-reviews-panel";
import { SettingsIntegrationsSection } from "@/components/settings/settings-integrations-section";
import { TeamSettings } from "@/components/settings/team-settings";
import { WorkspaceLeadsSettings } from "@/components/settings/workspace-leads-settings";
import { BookingAvailabilitySettings } from "@/components/settings/booking-availability-settings";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";

export function SettingsPageContent() {
  const { data: ctx, isLoading } = useWorkspaceContext();
  const isOwner = ctx?.isWorkspaceOwner ?? false;

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-3xl">
        <PageHeader title="Settings" description="Loading workspace…" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Settings"
        description={
          isOwner
            ? "Integrations, templates, duplicates, team, and custom fields."
            : "Workspace preferences for your team account."
        }
      />

      {isOwner && (
        <>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Booking availability</h2>
            <BookingAvailabilitySettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Website leads</h2>
            <WorkspaceLeadsSettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Integrations</h2>
            <SettingsIntegrationsSection />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Email templates</h2>
            <EmailTemplatesManager />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Duplicate contacts</h2>
            <DuplicateReviewsPanel />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Team</h2>
            <TeamSettings />
          </Card>
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-heading mb-4">Custom fields</h2>
            <p className="text-sm text-body-muted mb-4">
              Define extra fields for contacts, opportunities, and tickets.
            </p>
            <CustomFieldManager />
          </Card>
        </>
      )}

      {!isOwner && (
        <Card padding="lg">
          <p className="text-sm text-body-muted">
            You are signed in as a workspace teammate ({ctx?.role ?? "sales"}). CRM data
            is shared with your team. Owner-only settings are managed by the account owner.
          </p>
        </Card>
      )}
    </div>
  );
}
