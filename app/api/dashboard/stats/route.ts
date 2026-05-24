import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();

    const [contacts, opportunities, tickets, tasks] = await Promise.all([
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", workspaceOwnerId!),
      supabase
        .from("opportunities")
        .select("*", { count: "exact", head: true })
        .eq("user_id", workspaceOwnerId!),
      supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", workspaceOwnerId!)
        .in("status", ["open", "in_progress", "on_hold"]),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", workspaceOwnerId!)
        .in("status", ["open", "in_progress"]),
    ]);

    if (contacts.error) throw contacts.error;
    if (opportunities.error) throw opportunities.error;
    if (tickets.error) throw tickets.error;
    if (tasks.error) throw tasks.error;

    return NextResponse.json({
      contacts: contacts.count ?? 0,
      opportunities: opportunities.count ?? 0,
      openTickets: tickets.count ?? 0,
      pendingTasks: tasks.count ?? 0,
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
