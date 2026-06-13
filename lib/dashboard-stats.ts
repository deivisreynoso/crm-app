import { createServerSideClient } from "@/lib/supabase";

/** Aggregate CRM counts for the workspace tenant (owner's data). */
export type DashboardStats = {
  contacts: number;
  opportunities: number;
  openTickets: number;
  pendingTasks: number;
  leads: number;
  prospects: number;
  activeContacts: number;
  upcomingAppointments: number;
};

export async function getDashboardStats(workspaceOwnerId: string): Promise<DashboardStats> {
  const supabase = createServerSideClient();

  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [contacts, opportunities, tickets, tasks, upcomingEvents] =
    await Promise.all([
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspaceOwnerId),
    supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspaceOwnerId),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspaceOwnerId)
      .in("status", ["open", "in_progress", "on_hold"]),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspaceOwnerId)
      .in("status", ["open", "in_progress"]),
    supabase
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", workspaceOwnerId)
      .gte("start_time", now.toISOString())
      .lte("start_time", weekAhead.toISOString()),
  ]);

  const { data: contactRows } = await supabase
    .from("contacts")
    .select("status")
    .eq("user_id", workspaceOwnerId);

  const statuses = contactRows ?? [];

  return {
    contacts: contacts.count ?? 0,
    opportunities: opportunities.count ?? 0,
    openTickets: tickets.count ?? 0,
    pendingTasks: tasks.count ?? 0,
    leads: statuses.filter((c) => c.status === "lead").length,
    prospects: statuses.filter((c) => c.status === "prospect").length,
    activeContacts: statuses.filter((c) => c.status === "active").length,
    upcomingAppointments: upcomingEvents.count ?? 0,
  };
}
