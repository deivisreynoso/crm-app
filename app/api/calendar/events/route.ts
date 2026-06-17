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
import { enrichCompanyIdFromContact } from "@/lib/contacts/enrich-company-from-contact";
import { createGoogleCalendarEvent } from "@/lib/google/calendar";
import { assertCalendarAssigneePermission } from "@/lib/calendar/assert-assignee";
import { resolveGoogleSyncUserId } from "@/lib/calendar/resolve-sync-user";
import { enrichCalendarEventsWithOwners } from "@/lib/calendar/enrich-events";
import { notifyAppointmentEvent } from "@/lib/webhooks/notify-events";
import {
  listCalendarEventAttendees,
  resolveAttendeeEmails,
  upsertCalendarEventAttendees,
} from "@/lib/calendar/event-attendees";

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
    const assignedTo = params.get("assigned_to");
    const startDate = params.get("start_date");
    const endDate = params.get("end_date");

    if (contactId) query = query.eq("contact_id", contactId);
    if (companyId) query = query.eq("company_id", companyId);
    if (opportunityId) query = query.eq("opportunity_id", opportunityId);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
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

    const enriched = await enrichCalendarEventsWithOwners(
      supabase,
      (data ?? []) as Record<string, unknown>[]
    );
    return NextResponse.json({ data: enriched });
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

    const companyId = await enrichCompanyIdFromContact(
      supabase,
      workspaceOwnerId!,
      parsed.data.contact_id,
      parsed.data.company_id
    );

    const assigneeId = assertCalendarAssigneePermission(
      role!,
      isWorkspaceOwner,
      userId!,
      parsed.data.assigned_to
    );
    if (!assigneeId) {
      return NextResponse.json(
        { error: "You can only assign events to yourself." },
        { status: 403 }
      );
    }

    const isGoogleMeet = parsed.data.location_type === "google_meet";

    const row = {
      user_id: workspaceOwnerId!,
      contact_id: parsed.data.contact_id.trim(),
      company_id: companyId,
      opportunity_id: parsed.data.opportunity_id?.trim() || null,
      assigned_to: assigneeId,
      title: parsed.data.title.trim(),
      description: emptyToNull(parsed.data.description),
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      location: isGoogleMeet ? null : emptyToNull(parsed.data.location),
      location_type: parsed.data.location_type ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error: dbError } = await insertWithColumnFallback(
      (payload) =>
        supabase.from("calendar_events").insert([payload]).select().single(),
      row,
      ["location_type", "updated_at", "assigned_to"]
    );

    if (dbError) {
      const hint = dbError.message.includes("calendar_events_contact_required_check")
        ? "Link this event to a contact (run migration 037_require_contact_parent.sql)."
        : "Run migration 011_calendar_location_custom_field_meta.sql in Supabase.";
      return NextResponse.json({ error: dbError.message, hint }, { status: 500 });
    }

    const created = data as { id?: string } | null;
    const eventId = created?.id;

    if (eventId) {
      await upsertCalendarEventAttendees(
        supabase,
        eventId,
        {
          additional_users: parsed.data.additional_users,
          additional_contacts: parsed.data.additional_contacts,
        },
        {
          primaryUserId: assigneeId,
          primaryContactId: parsed.data.contact_id.trim(),
        }
      );
    }

    const extraAttendees = eventId
      ? await resolveAttendeeEmails(
          supabase,
          await listCalendarEventAttendees(supabase, eventId)
        )
      : [];

    const { data: primaryContact } = await supabase
      .from("contacts")
      .select("email, first_name, last_name")
      .eq("id", parsed.data.contact_id.trim())
      .maybeSingle();

    let primaryContactEmail: { email: string; displayName?: string } | null = null;
    if (primaryContact?.email) {
      const name = [primaryContact.first_name, primaryContact.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      primaryContactEmail = {
        email: (primaryContact.email as string).trim(),
        displayName: name || undefined,
      };
    }

    const googleAttendees = [
      ...(primaryContactEmail ? [primaryContactEmail] : []),
      ...extraAttendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      })),
    ];

    let googleEventId: string | null = null;
    let meetLink: string | null = null;
    let googleSyncUserId: string | null = null;
    try {
      googleSyncUserId = await resolveGoogleSyncUserId(supabase, {
        actorUserId: userId!,
        workspaceOwnerId: workspaceOwnerId!,
        assignedTo: assigneeId,
        preferActor: false,
      });
      const createdGoogle = await createGoogleCalendarEvent(googleSyncUserId, {
        title: row.title,
        description: row.description,
        location: row.location,
        start_time: row.start_time,
        end_time: row.end_time,
        addGoogleMeet: isGoogleMeet,
        attendees: googleAttendees.length ? googleAttendees : undefined,
      });
      googleEventId = createdGoogle.eventId;
      meetLink = createdGoogle.meetLink;
    } catch (syncErr) {
      console.error("Google Calendar sync on create:", syncErr);
    }

    if ((googleEventId || meetLink) && eventId) {
      const syncPatch: Record<string, unknown> = {
        is_synced: Boolean(googleEventId),
        google_sync_user_id: googleEventId ? googleSyncUserId : null,
        updated_at: new Date().toISOString(),
      };
      if (googleEventId) syncPatch.google_event_id = googleEventId;
      if (meetLink) {
        syncPatch.location = meetLink;
        syncPatch.location_type = "google_meet";
      }

      const { data: synced } = await supabase
        .from("calendar_events")
        .update(syncPatch)
        .eq("id", eventId)
        .eq("user_id", workspaceOwnerId!)
        .select()
        .single();

      const eventPayload = (synced ?? data) as Record<string, unknown>;
      void notifyAppointmentEvent(
        supabase,
        workspaceOwnerId!,
        "appointment.created",
        eventPayload
      );

      return NextResponse.json(synced ?? data, { status: 201 });
    }

    const createdEvent = (data ?? {}) as Record<string, unknown>;
    void notifyAppointmentEvent(
      supabase,
      workspaceOwnerId!,
      "appointment.created",
      createdEvent
    );

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/calendar/events:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
