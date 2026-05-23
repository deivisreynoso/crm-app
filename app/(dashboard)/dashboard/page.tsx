import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { getGreeting, getUserDisplayName } from "@/lib/user-display";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  CheckCircle2,
  Circle,
  Target,
  Ticket,
  Users,
  ListTodo,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const stats = userId
    ? await getDashboardStats(userId)
    : { contacts: 0, opportunities: 0, openTickets: 0, pendingTasks: 0 };

  const { firstName } = getUserDisplayName(session?.user ?? {});
  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      <section className="brand-gradient rounded-xl p-8 text-white shadow-[var(--shadow-md)] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="relative">
          <p className="text-sm font-medium text-white/80 uppercase tracking-wide">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-white/90 mt-2 text-sm max-w-lg">
            Here&apos;s what&apos;s happening with your CRM today.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Total Contacts"
          value={stats.contacts}
          icon={Users}
          href="/contacts"
          accent="navy"
        />
        <StatCard
          label="Active Opportunities"
          value={stats.opportunities}
          icon={Target}
          href="/opportunities"
          accent="sky"
        />
        <StatCard
          label="Open Service Tickets"
          value={stats.openTickets}
          icon={Ticket}
          href="/tickets"
          accent="magenta"
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pendingTasks}
          icon={ListTodo}
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
