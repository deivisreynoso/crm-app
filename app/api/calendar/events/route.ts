import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { calendarEventSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";
import { insertWithColumnFallback } from "@/lib/api/strip-insert";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";
import { createGoogleCalendarEvent } from "@/lib/google/calendar";

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const supabase = createServerSideClient();
    let query = supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("start_time", { ascending: true });

    const contactId = params.get("contact_id");
    const companyId = params.get("company_id");
    const opportunityId = params.get("opportunity_id");
    const startDate = params.get("start_date");
    const endDate = params.get("end_date");

    if (contactId) query = query.eq("contact_id", contactId);
    if (companyId) query = query.eq("company_id", companyId);
    if (opportunityId) query = query.eq("opportunity_id", opportunityId);
    if (startDate) {
      query = query.gte("start_time", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("start_time", `${endDate}T23:59:59.999Z`);
    }

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json(
        {
          error: dbError.message,
          hint: "Run migration 011 for location_type if needed.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/calendar/events:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = calendarEventSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Validation failed" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const parentCheck = await assertParentsInWorkspace(
      supabase,
      workspaceOwnerId!,
      parsed.data
    );
    const parentError = workspaceParentForbidden(parentCheck);
    if (parentError) return parentError;

    const row = {
      user_id: workspaceOwnerId!,
      contact_id: parsed.data.contact_id?.trim() || null,
      company_id: parsed.data.company_id?.trim() || null,
      opportunity_id: parsed.data.opportunity_id?.trim() || null,
      title: parsed.data.title.trim(),
      description: emptyToNull(parsed.data.description),
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      location: emptyToNull(parsed.data.location),
      location_type: parsed.data.location_type ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error: dbError } = await insertWithColumnFallback(
      (payload) =>
        supabase.from("calendar_events").insert([payload]).select().single(),
      row,
      ["location_type", "updated_at"]
    );

    if (dbError) {
      const hint = dbError.message.includes("calendar_events_parent_check")
        ? "Run migration 012_relax_parent_checks.sql to allow events without a linked contact."
        : "Run migration 011_calendar_location_custom_field_meta.sql in Supabase.";
      return NextResponse.json({ error: dbError.message, hint }, { status: 500 });
    }

    let googleEventId: string | null = null;
    try {
      googleEventId = await createGoogleCalendarEvent(workspaceOwnerId!, {
        title: row.title,
        description: row.description,
        location: row.location,
        start_time: row.start_time,
        end_time: row.end_time,
      });
    } catch (syncErr) {
      console.error("Google Calendar sync on create:", syncErr);
    }

    const created = data as { id?: string } | null;
    if (googleEventId && created?.id) {
      const { data: synced } = await supabase
        .from("calendar_events")
        .update({
          google_event_id: googleEventId,
          is_synced: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", created.id)
        .eq("user_id", workspaceOwnerId!)
        .select()
        .single();

      return NextResponse.json(synced ?? data, { status: 201 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/calendar/events:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
