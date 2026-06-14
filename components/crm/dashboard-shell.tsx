"use client";

import { CrmLocaleProvider } from "@/components/crm/crm-locale-provider";
import { DemoModeBanner } from "@/components/crm/demo-mode-banner";
import { WorkspaceProvider } from "@/components/crm/workspace-provider";
import { SidebarBrand, SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarFooter } from "@/components/dashboard/sidebar-footer";
import { AppHeader } from "@/components/dashboard/app-header";
import { SessionTimeoutGuard } from "@/components/auth/session-timeout-guard";

type Props = {
  initialLocale?: string | null;
  user: { name?: string | null; email?: string | null; image?: string | null };
  children: React.ReactNode;
};

export function DashboardShell({ initialLocale, user, children }: Props) {
  return (
    <CrmLocaleProvider initialLocale={initialLocale}>
      <WorkspaceProvider>
      <div className="h-screen flex overflow-hidden bg-[var(--background)]">
        <aside
          className="w-56 shrink-0 flex flex-col h-full border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]"
          aria-label="Sidebar"
        >
          <div className="shrink-0 px-3 py-4 border-b border-[var(--sidebar-border)]">
            <SidebarBrand />
          </div>
          <div className="flex-1 min-h-0 px-2 py-4 overflow-y-auto">
            <SidebarNav />
          </div>
          <SidebarFooter />
        </aside>
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <DemoModeBanner />
          <header className="shrink-0 z-20 border-b border-[var(--header-border)] bg-[var(--header)] backdrop-blur-md px-6 lg:px-10 py-3">
            <AppHeader user={user} />
          </header>
          <main className="flex-1 min-h-0 p-6 lg:p-8 overflow-y-auto w-full">
            {children}
          </main>
        </div>
      </div>
      <SessionTimeoutGuard />
      </WorkspaceProvider>
    </CrmLocaleProvider>
  );
}
