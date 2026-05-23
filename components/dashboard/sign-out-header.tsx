import { AppHeader } from "@/components/dashboard/app-header";

interface SignOutHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

/** @deprecated use AppHeader — kept for layout import compatibility */
export function SignOutHeader({ user }: SignOutHeaderProps) {
  return <AppHeader user={user} />;
}
