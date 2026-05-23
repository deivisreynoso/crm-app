import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { ticketSchema } from "@/lib/validators";
import { buildTicketRecord } from "@/lib/ticket-payload";
import { enrichTicket, listTicketsEnriched } from "@/lib/ticket-queries";
import { generateServiceTicketNumber } from "@/lib/service-ticket-number";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const data = await listTicketsEnriched(userId!, {
      contact_id: params.get("contact_id") ?? undefined,
      company_id: params.get("company_id") ?? undefined,
      status: params.get("status") ?? undefined,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/tickets error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const ticketNumber = await generateServiceTicketNumber(userId!);
    const { data, error: dbError } = await supabase
      .from("tickets")
      .insert([{ ...buildTicketRecord(parsed.data, userId!), ticket_number: ticketNumber }])
      .select("*")
      .single();

    if (dbError) {
      console.error("POST ticket db error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    let enriched = data;
    try {
      enriched = await enrichTicket(data);
    } catch (e) {
      console.error("POST ticket enrich:", e);
    }

    return NextResponse.json(enriched, { status: 201 });
  } catch (err) {
    console.error("POST /api/tickets error:", err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
