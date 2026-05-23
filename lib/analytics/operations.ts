import { createServerSideClient } from "@/lib/supabase";

export interface OperationsMetrics {
  leads: number;
  prospects: number;
  activeContacts: number;
  totalContacts: number;
  openTickets: number;
  ticketsInProgress: number;
  ticketsClosedInRange: number;
  urgentTickets: number;
  upcomingAppointments: number;
  appointmentsInRange: number;
  ticketsByStatus: Array<{ status: string; count: number }>;
  ticketsByPriority: Array<{ priority: string; count: number }>;
}

export async function getOperationsMetrics(
  userId: string,
  range?: { startDate?: string; endDate?: string }
): Promise<OperationsMetrics> {
  const supabase = createServerSideClient();
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const startIso = range?.startDate
    ? new Date(`${range.startDate}T00:00:00.000Z`).toISOString()
    : undefined;
  const endIso = range?.endDate
    ? new Date(`${range.endDate}T23:59:59.999Z`).toISOString()
    : undefined;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("status")
    .eq("user_id", userId);

  const allContacts = contacts ?? [];
  const leads = allContacts.filter((c) => c.status === "lead").length;
  const prospects = allContacts.filter((c) => c.status === "prospect").length;
  const activeContacts = allContacts.filter((c) => c.status === "active").length;

  let ticketQuery = supabase
    .from("tickets")
    .select("status, priority, created_at, updated_at")
    .eq("user_id", userId);

  const { data: tickets } = await ticketQuery;
  const allTickets = tickets ?? [];

  const inRange = (iso: string) => {
    if (!startIso && !endIso) return true;
    const t = new Date(iso).getTime();
    if (startIso && t < new Date(startIso).getTime()) return false;
    if (endIso && t > new Date(endIso).getTime()) return false;
    return true;
  };

  const openTickets = allTickets.filter(
    (t) => t.status === "open" || t.status === "on_hold"
  ).length;
  const ticketsInProgress = allTickets.filter(
    (t) => t.status === "in_progress"
  ).length;
  const ticketsClosedInRange = allTickets.filter(
    (t) => t.status === "closed" && inRange(t.updated_at as string)
  ).length;
  const urgentTickets = allTickets.filter(
    (t) =>
      t.priority === "urgent" &&
      t.status !== "closed"
  ).length;

  const statusMap = new Map<string, number>();
  const priorityMap = new Map<string, number>();
  for (const t of allTickets) {
    if (startIso || endIso) {
      if (!inRange(t.created_at as string)) continue;
    }
    statusMap.set(t.status, (statusMap.get(t.status) ?? 0) + 1);
    priorityMap.set(t.priority, (priorityMap.get(t.priority) ?? 0) + 1);
  }

  let eventsQuery = supabase
    .from("calendar_events")
    .select("id, start_time")
    .eq("user_id", userId)
    .gte("start_time", now.toISOString());

  const { data: upcoming } = await eventsQuery;
  const upcomingAppointments = (upcoming ?? []).filter(
    (e) => new Date(e.start_time as string) <= weekAhead
  ).length;

  let rangeEventsQuery = supabase
    .from("calendar_events")
    .select("id, start_time")
    .eq("user_id", userId);

  if (startIso) rangeEventsQuery = rangeEventsQuery.gte("start_time", startIso);
  if (endIso) rangeEventsQuery = rangeEventsQuery.lte("start_time", endIso);

  const { data: rangeEvents } = await rangeEventsQuery;

  return {
    leads,
    prospects,
    activeContacts,
    totalContacts: allContacts.length,
    openTickets,
    ticketsInProgress,
    ticketsClosedInRange,
    urgentTickets,
    upcomingAppointments,
    appointmentsInRange: rangeEvents?.length ?? 0,
    ticketsByStatus: [...statusMap.entries()].map(([status, count]) => ({
      status,
      count,
    })),
    ticketsByPriority: [...priorityMap.entries()].map(([priority, count]) => ({
      priority,
      count,
    })),
  };
}
