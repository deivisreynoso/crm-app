import { createServerSideClient } from "@/lib/supabase";

export async function getDashboardStats(userId: string) {
  const supabase = createServerSideClient();

  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [contacts, opportunities, tickets, tasks, upcomingEvents] =
    await Promise.all([
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["open", "in_progress", "on_hold"]),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["open", "in_progress"]),
    supabase
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("start_time", now.toISOString())
      .lte("start_time", weekAhead.toISOString()),
  ]);

  const { data: contactRows } = await supabase
    .from("contacts")
    .select("status")
    .eq("user_id", userId);

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
