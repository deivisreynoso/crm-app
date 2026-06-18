import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ilikePattern } from "@/lib/api/sanitize-search";
import {
  applyContactScope,
  applyOpportunityScope,
  applyTicketScope,
} from "@/lib/api/data-scope";
import { createServerSideClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const pattern = ilikePattern(q);
    const supabase = createServerSideClient();

    let contactsQuery = supabase
      .from("contacts")
      .select("id, first_name, last_name, email, company")
      .eq("user_id", workspaceOwnerId!)
      .or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`
      )
      .limit(8);
    contactsQuery = applyContactScope(
      contactsQuery,
      role!,
      isWorkspaceOwner,
      userId!
    );

    let opportunitiesQuery = supabase
      .from("opportunities")
      .select("id, title, stage, value")
      .eq("user_id", workspaceOwnerId!)
      .ilike("title", pattern)
      .limit(5);
    opportunitiesQuery = applyOpportunityScope(
      opportunitiesQuery,
      role!,
      isWorkspaceOwner,
      userId!
    );

    let ticketsQuery = supabase
      .from("tickets")
      .select("id, title, subject, ticket_number, status")
      .eq("user_id", workspaceOwnerId!)
      .or(
        `title.ilike.${pattern},subject.ilike.${pattern},ticket_number.ilike.${pattern}`
      )
      .limit(5);
    ticketsQuery = applyTicketScope(
      ticketsQuery,
      role!,
      isWorkspaceOwner,
      userId!
    );

    const [contacts, tickets, opportunities] = await Promise.all([
      contactsQuery,
      ticketsQuery,
      opportunitiesQuery,
    ]);

    const results = [
      ...(contacts.data ?? []).map((c) => ({
        type: "contact" as const,
        id: c.id,
        label: `${c.first_name} ${c.last_name}`,
        sublabel: c.email ?? c.company ?? undefined,
        href: `/contacts/${c.id}`,
      })),
      ...(tickets.data ?? []).map((t) => ({
        type: "ticket" as const,
        id: t.id,
        label: t.subject?.trim() || t.title,
        sublabel: t.ticket_number ?? t.status,
        href: `/tickets/${t.id}`,
      })),
      ...(opportunities.data ?? []).map((o) => ({
        type: "opportunity" as const,
        id: o.id,
        label: o.title,
        sublabel: o.value ? `$${Number(o.value).toLocaleString()}` : o.stage,
        href: `/opportunities`,
      })),
    ];

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("GET /api/search error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
