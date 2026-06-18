"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
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

function SidebarPanel({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="shrink-0 px-3 py-4 border-b border-[var(--sidebar-border)]">
        <SidebarBrand />
      </div>
      <div className="flex-1 min-h-0 px-2 py-4 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <SidebarFooter />
    </>
  );
}

export function DashboardShell({ initialLocale, user, children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <CrmLocaleProvider initialLocale={initialLocale}>
      <WorkspaceProvider>
        <div className="h-[100dvh] flex overflow-hidden bg-[var(--background)]">
          <aside
            className="hidden lg:flex w-56 shrink-0 flex-col h-full border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]"
            aria-label="Sidebar"
          >
            <SidebarPanel />
          </aside>

          {mobileNavOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
              />
              <aside className="relative h-full w-[min(18rem,88vw)] flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] shadow-xl">
                <div className="flex items-center justify-end px-3 py-2 border-b border-[var(--sidebar-border)]">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]"
                    aria-label="Close menu"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <SidebarPanel onNavigate={() => setMobileNavOpen(false)} />
              </aside>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <DemoModeBanner />
            <header className="shrink-0 z-20 border-b border-[var(--header-border)] bg-[var(--header)] backdrop-blur-md px-3 sm:px-6 lg:px-10 py-2.5 sm:py-3">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  type="button"
                  className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--card-border)] hover:bg-[var(--sidebar-hover)]"
                  aria-label="Open navigation menu"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <AppHeader user={user} />
                </div>
              </div>
            </header>
            <main className="flex-1 min-h-0 p-3 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden w-full">
              {children}
            </main>
          </div>
        </div>
        <SessionTimeoutGuard />
      </WorkspaceProvider>
    </CrmLocaleProvider>
  );
}
