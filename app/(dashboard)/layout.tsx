import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/crm/dashboard-shell";
import { createServerSideClient } from "@/lib/supabase";
import { resolveWorkspaceContext } from "@/lib/team/workspace";

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
  if (userId) {
    const workspace = await resolveWorkspaceContext(userId);
    const supabase = createServerSideClient();
    const { data } = await supabase
      .from("user_settings")
      .select("ui_locale")
      .eq("user_id", workspace.workspaceOwnerId)
      .maybeSingle();
    uiLocale = (data?.ui_locale as string | null) ?? null;
  }

  return (
    <DashboardShell
      initialLocale={uiLocale}
      user={session.user ?? {}}
    >
      {children}
    </DashboardShell>
  );
}
