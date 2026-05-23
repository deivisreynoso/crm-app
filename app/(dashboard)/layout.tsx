import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarBrand, SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarFooter } from "@/components/dashboard/sidebar-footer";
import { AppHeader } from "@/components/dashboard/app-header";

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

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <aside
        className="w-[280px] shrink-0 flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]"
        aria-label="Sidebar"
      >
        <div className="px-5 py-6 border-b border-[var(--sidebar-border)]">
          <SidebarBrand />
        </div>
        <div className="flex-1 px-3 py-5 overflow-y-auto">
          <SidebarNav />
        </div>
        <SidebarFooter />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 sticky top-0 z-20 border-b border-[var(--header-border)] bg-[var(--header)] backdrop-blur-md px-6 lg:px-10 py-3">
          <AppHeader user={session.user ?? {}} />
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-auto w-full">{children}</main>
      </div>
    </div>
  );
}
