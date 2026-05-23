import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { ticketSchema } from "@/lib/validators";
import { buildTicketRecord } from "@/lib/ticket-payload";
import { enrichTicket, listTicketsEnriched } from "@/lib/ticket-queries";
import {
  generateServiceTicketNumber,
  isTicketNumberConflict,
  ticketDisplayLabel,
} from "@/lib/service-ticket-number";
import { createNotification } from "@/lib/notifications/create-notification";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const data = await listTicketsEnriched(userId!, {
      contact_id: params.get("contact_id") ?? undefined,
      company_id: params.get("company_id") ?? undefined,
      status: params.get("status") ?? undefined,
      created_from: params.get("created_from") ?? undefined,
      created_to: params.get("created_to") ?? undefined,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/tickets error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function insertTicket(
  supabase: ReturnType<typeof createServerSideClient>,
  userId: string,
  payload: ReturnType<typeof buildTicketRecord>,
  ticketNumber: string
) {
  return supabase
    .from("tickets")
    .insert([{ ...payload, ticket_number: ticketNumber }])
    .select("*")
    .single();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatValidationDetails(parsed.error.flatten()) || "Please check the form.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const record = buildTicketRecord(parsed.data, userId!);
    let ticketNumber = await generateServiceTicketNumber(userId!);

    let { data, error: dbError } = await insertTicket(
      supabase,
      userId!,
      record,
      ticketNumber
    );

    if (dbError && isTicketNumberConflict(dbError.message)) {
      ticketNumber = await generateServiceTicketNumber(userId!);
      ({ data, error: dbError } = await insertTicket(
        supabase,
        userId!,
        record,
        ticketNumber
      ));
    }

    if (dbError) {
      console.error("POST ticket db error:", dbError);
      const status = isTicketNumberConflict(dbError.message) ? 409 : 500;
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status }
      );
    }

    let enriched = data;
    try {
      enriched = await enrichTicket(data);
    } catch (e) {
      console.error("POST ticket enrich:", e);
    }

    const label = ticketDisplayLabel({
      subject: parsed.data.subject,
      title: parsed.data.title,
      ticket_number: ticketNumber,
    });

    await createNotification(supabase, userId!, {
      kind: "ticket_update",
      title: "New service ticket",
      message: ticketNumber ? `${ticketNumber}: ${label}` : label,
      related_entity_type: "ticket",
      related_entity_id: data.id as string,
    });

    return NextResponse.json(enriched, { status: 201 });
  } catch (err) {
    console.error("POST /api/tickets error:", err);
    return NextResponse.json(
      { error: "We could not create this ticket. Please try again." },
      { status: 500 }
    );
  }
}
