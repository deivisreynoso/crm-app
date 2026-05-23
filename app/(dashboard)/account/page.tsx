import { PageHeader } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { AccountSettings } from "@/components/settings/account-settings";

export default function MyAccountPage() {
  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="My account"
        description="Your profile, security, notifications, and currency."
      />
      <Card padding="lg">
        <AccountSettings />
      </Card>
    </div>
  );
}
