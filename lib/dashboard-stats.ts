import { createServerSideClient } from "@/lib/supabase";

export async function getDashboardStats(userId: string) {
  const supabase = createServerSideClient();

  const [contacts, opportunities, tickets, tasks] = await Promise.all([
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
  ]);

  return {
    contacts: contacts.count ?? 0,
    opportunities: opportunities.count ?? 0,
    openTickets: tickets.count ?? 0,
    pendingTasks: tasks.count ?? 0,
  };
}
