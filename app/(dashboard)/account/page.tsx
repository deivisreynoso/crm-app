import { PageHeader } from "@/components/ui/page-shell";
import { AccountSettings } from "@/components/settings/account-settings";

export default function MyAccountPage() {
  return (
    <div className="space-y-6 w-full max-w-4xl">
      <PageHeader
        title="My account"
        description="Profile, password, notifications, and display preferences."
      />
      <AccountSettings />
    </div>
  );
}
