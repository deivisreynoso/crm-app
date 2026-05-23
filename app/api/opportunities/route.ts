import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { opportunitySchema } from "@/lib/validators";
import { buildOpportunityRecord } from "@/lib/opportunity-payload";
import { attachContactToOpportunity, listOpportunitiesWithContacts } from "@/lib/opportunity-queries";
import { triggerN8NWebhook } from "@/lib/n8n";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const pipelineId = new URL(req.url).searchParams.get("pipeline_id") ?? undefined;
    const contactId = new URL(req.url).searchParams.get("contact_id") ?? undefined;
    const data = await listOpportunitiesWithContacts(userId!, pipelineId, contactId);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/opportunities error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = opportunitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const payload = buildOpportunityRecord(parsed.data, userId!);

    if (!payload.company_id && parsed.data.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("company_id")
        .eq("id", parsed.data.contact_id)
        .single();
      if (contact?.company_id) {
        payload.company_id = contact.company_id;
      }
    }

    const { data, error: dbError } = await supabase
      .from("opportunities")
      .insert([payload])
      .select("*")
      .single();

    if (dbError) {
      console.error("POST opportunity db error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    let enriched = data;
    try {
      enriched = await attachContactToOpportunity(data);
    } catch (enrichErr) {
      console.error("POST opportunity enrich error:", enrichErr);
    }
    await triggerN8NWebhook("opportunity.created", enriched);

    return NextResponse.json(enriched, { status: 201 });
  } catch (err) {
    console.error("POST /api/opportunities error:", err);
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
