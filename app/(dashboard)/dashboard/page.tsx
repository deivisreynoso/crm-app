import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { resolveWorkspaceContext } from "@/lib/team/workspace";
import { getUserDisplayName } from "@/lib/user-display";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Target,
  Ticket,
  UserPlus,
  Users,
  ListTodo,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  const workspace = actorId ? await resolveWorkspaceContext(actorId) : null;
  const stats = workspace
    ? await getDashboardStats(workspace.workspaceOwnerId)
    : {
        contacts: 0,
        opportunities: 0,
        openTickets: 0,
        pendingTasks: 0,
        leads: 0,
        prospects: 0,
        activeContacts: 0,
        upcomingAppointments: 0,
      };

  const { firstName } = getUserDisplayName(session?.user ?? {});

  return (
    <div className="space-y-8">
      <section className="brand-gradient rounded-xl p-8 text-white shadow-[var(--shadow-md)] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="relative">
          <p className="text-sm font-medium text-white/80 uppercase tracking-wide">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">
            <DashboardGreeting firstName={firstName} />
          </h1>
          <p className="text-white/90 mt-2 text-sm max-w-lg">
            Here&apos;s what&apos;s happening with your CRM today.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Leads"
          value={stats.leads}
          icon={UserPlus}
          href="/contacts"
          accent="navy"
        />
        <StatCard
          label="Prospects"
          value={stats.prospects}
          icon={Users}
          href="/contacts"
          accent="sky"
        />
        <StatCard
          label="Active contacts"
          value={stats.activeContacts}
          icon={Users}
          href="/contacts"
          accent="success"
        />
        <StatCard
          label="Open service tickets"
          value={stats.openTickets}
          icon={Ticket}
          href="/tickets"
          accent="magenta"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Upcoming meetings"
          value={stats.upcomingAppointments}
          icon={Calendar}
          href="/calendar"
          accent="sky"
        />
        <StatCard
          label="Opportunities"
          value={stats.opportunities}
          icon={Target}
          href="/opportunities"
          accent="navy"
        />
        <StatCard
          label="Pending tasks"
          value={stats.pendingTasks}
          icon={ListTodo}
          href="/contacts"
          accent="magenta"
        />
        <StatCard
          label="Total contacts"
          value={stats.contacts}
          icon={Users}
          href="/analytics"
          accent="success"
        />
      </div>

      <Card>
        <h2 className="text-heading text-lg font-semibold mb-4">Getting Started</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-2 text-body-muted">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
            Account created and authenticated
          </li>
          {stats.contacts > 0 ? (
            <li className="flex items-center gap-2 text-body-muted">
              <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
              {stats.contacts} contact{stats.contacts !== 1 ? "s" : ""} in your CRM
            </li>
          ) : (
            <li className="flex items-center gap-2 text-body-muted">
              <Circle className="h-4 w-4 shrink-0" />
              <Link
                href="/contacts"
                className="text-[var(--primary)] font-medium hover:underline"
              >
                Create your first contact
              </Link>
            </li>
          )}
          <li className="flex items-center gap-2 text-body-muted">
            <Circle className="h-4 w-4 shrink-0" />
            <Link
              href="/opportunities"
              className="text-[var(--primary)] font-medium hover:underline"
            >
              Manage opportunities on the pipeline board
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
