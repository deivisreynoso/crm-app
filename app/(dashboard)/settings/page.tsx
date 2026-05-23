import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your workspace preferences and account options."
      />
      <Card>
        <h2 className="text-sm font-semibold text-heading mb-2">Appearance</h2>
        <p className="text-sm text-body-muted">
          Use the sun/moon toggle in the top bar to switch between light and dark mode.
        </p>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold text-heading mb-2">Account</h2>
        <p className="text-sm text-body-muted">
          Profile and notification settings will be available in a future update.
        </p>
      </Card>
    </div>
  );
}
