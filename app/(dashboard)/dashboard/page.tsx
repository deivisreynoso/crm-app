import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { resolveWorkspaceContext } from "@/lib/team/workspace";
import { getUserDisplayName } from "@/lib/user-display";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { Suspense } from "react";
import { DashboardAnalyticsPanel } from "@/components/dashboard/dashboard-analytics-panel";

const EMPTY_STATS = {
  contacts: 0,
  opportunities: 0,
  openTickets: 0,
  pendingTasks: 0,
  leads: 0,
  prospects: 0,
  activeContacts: 0,
  upcomingAppointments: 0,
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  const workspace = actorId ? await resolveWorkspaceContext(actorId) : null;
  const stats = workspace
    ? await getDashboardStats(workspace.workspaceOwnerId)
    : EMPTY_STATS;

  const { firstName } = getUserDisplayName(session?.user ?? {});

  return (
    <div className="space-y-6">
      <section className="brand-gradient rounded-xl px-6 py-6 text-white shadow-[var(--shadow-md)] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">
            <DashboardGreeting firstName={firstName} />
          </h1>
          <p className="text-white/85 mt-1 text-sm">
            Your workspace at a glance.
          </p>
        </div>
      </section>

      <Suspense fallback={<p className="text-sm text-body-muted">Loading…</p>}>
        <DashboardAnalyticsPanel stats={stats} />
      </Suspense>
    </div>
  );
}
