import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/crm/dashboard-shell";
import { createServerSideClient } from "@/lib/supabase";
import { resolveWorkspaceContext } from "@/lib/team/workspace";
import { isWorkspaceAccessDeniedError } from "@/lib/team/workspace-access";
import { resolveProfileAvatarUrl } from "@/lib/storage/profile-avatar";

export const metadata: Metadata = {
  title: "ClickIn 360 CRM",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as { id?: string })?.id;
  let uiLocale: string | null = null;
  let avatarUrl: string | null = null;
  if (userId) {
    try {
      const workspace = await resolveWorkspaceContext(userId);
      const supabase = createServerSideClient();
      const { data } = await supabase
        .from("user_settings")
        .select("ui_locale")
        .eq("user_id", workspace.workspaceOwnerId)
        .maybeSingle();
      uiLocale = (data?.ui_locale as string | null) ?? null;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("avatar_storage_path")
        .eq("id", userId)
        .maybeSingle();
      avatarUrl = await resolveProfileAvatarUrl(
        supabase,
        profile?.avatar_storage_path as string | null | undefined
      );
    } catch (err) {
      if (isWorkspaceAccessDeniedError(err)) {
        redirect("/login?error=not_a_member");
      }
      throw err;
    }
  }

  const shellUser = {
    ...session.user,
    image: avatarUrl ?? session.user?.image ?? null,
  };

  return (
    <DashboardShell
      initialLocale={uiLocale}
      user={shellUser}
    >
      {children}
    </DashboardShell>
  );
}
