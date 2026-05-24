import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { calendarEventPatchSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";
import { updateWithColumnFallback } from "@/lib/api/strip-update";
import {
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";

type RouteContext = { params: Promise<{ id: string }> };

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json(
        { error: "We could not find that event." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/calendar/events/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = calendarEventPatchSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Please check the form and try again." },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (d.title !== undefined) updates.title = d.title.trim();
    if (d.description !== undefined) {
      updates.description = emptyToNull(d.description);
    }
    if (d.start_time !== undefined) updates.start_time = d.start_time;
    if (d.end_time !== undefined) updates.end_time = d.end_time;
    if (d.location !== undefined) updates.location = emptyToNull(d.location);
    if (d.location_type !== undefined) updates.location_type = d.location_type;
    if (d.contact_id !== undefined) {
      updates.contact_id = d.contact_id?.trim() ? d.contact_id : null;
    }
    if (d.company_id !== undefined) {
      updates.company_id = d.company_id?.trim() ? d.company_id : null;
    }
    if (d.opportunity_id !== undefined) {
      updates.opportunity_id = d.opportunity_id?.trim() ? d.opportunity_id : null;
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await updateWithColumnFallback(
      (payload) =>
        supabase
          .from("calendar_events")
          .update(payload)
          .eq("id", id)
          .eq("user_id", workspaceOwnerId!)
          .select()
          .single(),
      updates,
      ["location_type", "updated_at"]
    );

    if (dbError) {
      console.error("PATCH calendar event:", dbError.message);
      const friendly = humanizeDbError(dbError.message);
      const status = dbError.message.includes("0 rows") ? 404 : 500;
      return NextResponse.json(
        {
          error:
            status === 404
              ? "We could not find that event or you do not have access to update it."
              : friendly,
        },
        { status }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "We could not find that event." },
        { status: 404 }
      );
    }

    const eventRow = data as Record<string, unknown>;
    if (eventRow.google_event_id) {
      try {
        await updateGoogleCalendarEvent(workspaceOwnerId!, String(eventRow.google_event_id), {
          title: String(eventRow.title),
          description: (eventRow.description as string | null) ?? null,
          location: (eventRow.location as string | null) ?? null,
          start_time: String(eventRow.start_time),
          end_time: String(eventRow.end_time),
        });
      } catch (syncErr) {
        console.error("Google Calendar sync on update:", syncErr);
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/calendar/events/[id]:", err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data: existing } = await supabase
      .from("calendar_events")
      .select("google_event_id")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (existing?.google_event_id) {
      try {
        await deleteGoogleCalendarEvent(
          userId!,
          existing.google_event_id as string
        );
      } catch (syncErr) {
        console.error("Google Calendar sync on delete:", syncErr);
      }
    }

    const { error: dbError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/calendar/events/[id]:", err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
