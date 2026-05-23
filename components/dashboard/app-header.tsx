import { GlobalSearch } from "@/components/dashboard/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <div className="flex w-full items-center gap-6 lg:gap-12 min-w-0">
      <div className="flex-1 min-w-0">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </div>
  );
}
