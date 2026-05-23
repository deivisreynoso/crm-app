import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { ticketSchema } from "@/lib/validators";
import { buildTicketUpdate } from "@/lib/ticket-payload";
import { enrichTicket } from "@/lib/ticket-queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Service ticket not found" }, { status: 404 });
    }

    return NextResponse.json(await enrichTicket(data));
  } catch (err) {
    console.error("GET /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = ticketSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tickets")
      .update({ ...buildTicketUpdate(parsed.data), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId!)
      .select("*")
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(await enrichTicket(data));
  } catch (err) {
    console.error("PATCH /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("tickets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}
