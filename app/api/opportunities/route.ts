import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { opportunitySchema } from "@/lib/validators";
import { buildOpportunityRecord } from "@/lib/opportunity-payload";
import { attachContactToOpportunity, listOpportunitiesWithContacts } from "@/lib/opportunity-queries";
import { triggerN8NWebhook } from "@/lib/n8n";
import { createNotification } from "@/lib/notifications/create-notification";
import { logContactActivity } from "@/lib/activities/log-contact-activity";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const data = await listOpportunitiesWithContacts(userId!, {
      pipelineId: params.get("pipeline_id") ?? undefined,
      contactId: params.get("contact_id") ?? undefined,
      stage: params.get("stage") ?? undefined,
      search: params.get("search") ?? undefined,
      createdFrom: params.get("created_from") ?? undefined,
      createdTo: params.get("created_to") ?? undefined,
    });

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
    await createNotification(supabase, userId!, {
      kind: "opportunity_reminder",
      title: "New opportunity",
      message: parsed.data.title,
      related_entity_type: "opportunity",
      related_entity_id: data.id as string,
    });

    if (parsed.data.contact_id) {
      await logContactActivity(supabase, {
        userId: userId!,
        contactId: parsed.data.contact_id,
        type: "created",
        description: `Opportunity created: ${parsed.data.title}`,
        metadata: { opportunity_id: data.id },
      });
    }

    return NextResponse.json(enriched, { status: 201 });
  } catch (err) {
    console.error("POST /api/opportunities error:", err);
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
