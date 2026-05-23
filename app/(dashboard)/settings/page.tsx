import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { CustomFieldManager } from "@/components/custom-fields/custom-field-manager";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { NotificationPreferencesSettings } from "@/components/settings/notification-preferences-settings";
import { EmailTemplatesManager } from "@/components/settings/email-templates-manager";
import { DuplicateReviewsPanel } from "@/components/settings/duplicate-reviews-panel";
import { GoogleCalendarSettings } from "@/components/settings/google-calendar-settings";

export default function SettingsPage() {
  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your workspace preferences and custom fields."
      />
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-heading mb-2">Appearance</h2>
        <p className="text-sm text-body-muted">
          Use the sun/moon toggle in the top bar to switch between light and dark mode.
        </p>
      </Card>
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-heading mb-4">Currency</h2>
        <CurrencySettings />
      </Card>
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-heading mb-4">Integrations</h2>
        <GoogleCalendarSettings />
      </Card>
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-heading mb-4">Notifications</h2>
        <NotificationPreferencesSettings />
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
        <h2 className="text-sm font-semibold text-heading mb-4">Custom fields</h2>
        <p className="text-sm text-body-muted mb-4">
          Define extra fields for contacts, opportunities, and tickets. Values are stored on
          each record&apos;s custom fields.
        </p>
        <CustomFieldManager />
      </Card>
    </div>
  );
}
