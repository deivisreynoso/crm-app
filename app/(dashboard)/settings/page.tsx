import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { CustomFieldManager } from "@/components/custom-fields/custom-field-manager";
import { CurrencySettings } from "@/components/settings/currency-settings";

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
        <h2 className="text-sm font-semibold text-heading mb-4">Custom fields</h2>
        <p className="text-sm text-body-muted mb-4">
          Define extra fields for contacts, opportunities, and tickets. Values are stored on
          each record&apos;s <code className="text-xs">custom_fields</code> JSON.
        </p>
        <CustomFieldManager />
      </Card>
    </div>
  );
}
