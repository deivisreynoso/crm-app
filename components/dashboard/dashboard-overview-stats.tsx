import {
  Calendar,
  ListTodo,
  Target,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import type { DashboardStats } from "@/lib/dashboard-stats";

export function DashboardOverviewStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard label="Leads" value={stats.leads} icon={UserPlus} href="/contacts" accent="navy" />
      <StatCard label="Prospects" value={stats.prospects} icon={Users} href="/contacts" accent="sky" />
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
        href="/contacts"
        accent="success"
      />
    </div>
  );
}
