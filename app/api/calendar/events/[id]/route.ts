import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { calendarEventPatchSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";
import { enrichCompanyIdFromContact } from "@/lib/contacts/enrich-company-from-contact";
import { updateWithColumnFallback } from "@/lib/api/strip-update";
import {
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";
import { assertCalendarAssigneePermission } from "@/lib/calendar/assert-assignee";
import { resolveGoogleSyncUserId } from "@/lib/calendar/resolve-sync-user";
import { buildGoogleSyncAttendees } from "@/lib/calendar/google-sync-attendees";
import { notifyAppointmentEvent } from "@/lib/webhooks/notify-events";
import {
  listCalendarEventAttendees,
  resolveAttendeeEmails,
  upsertCalendarEventAttendees,
} from "@/lib/calendar/event-attendees";

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
    const supabase = createServerSideClient();
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
      if (d.contact_id?.trim()) {
        updates.company_id = await enrichCompanyIdFromContact(
          supabase,
          workspaceOwnerId!,
          d.contact_id,
          d.company_id
        );
      }
    } else if (d.company_id !== undefined) {
      updates.company_id = d.company_id?.trim() ? d.company_id : null;
    }
    if (d.opportunity_id !== undefined) {
      updates.opportunity_id = d.opportunity_id?.trim() ? d.opportunity_id : null;
    }
    if (d.assigned_to !== undefined) {
      const assigneeId = assertCalendarAssigneePermission(
        role!,
        isWorkspaceOwner,
        userId!,
        d.assigned_to
      );
      if (!assigneeId) {
        return NextResponse.json(
          { error: "You can only assign events to yourself." },
          { status: 403 }
        );
      }
      updates.assigned_to = assigneeId;
    }

    const parentCheck = await assertParentsInWorkspace(supabase, workspaceOwnerId!, {
      contact_id: d.contact_id,
      company_id: d.company_id,
      opportunity_id: d.opportunity_id,
    });
    const parentError = workspaceParentForbidden(parentCheck);
    if (parentError) return parentError;

    const { data: existingRow } = await supabase
      .from("calendar_events")
      .select("contact_id, assigned_to")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (d.additional_users !== undefined || d.additional_contacts !== undefined) {
      await upsertCalendarEventAttendees(
        supabase,
        id,
        {
          additional_users: d.additional_users,
          additional_contacts: d.additional_contacts,
        },
        {
          primaryUserId:
            (updates.assigned_to as string | undefined) ??
            (existingRow?.assigned_to as string | undefined) ??
            undefined,
          primaryContactId:
            (updates.contact_id as string | undefined) ??
            (existingRow?.contact_id as string | undefined) ??
            undefined,
        }
      );
    }

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
      ["location_type", "updated_at", "assigned_to"]
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
        const syncUserId = await resolveGoogleSyncUserId(supabase, {
          actorUserId: userId!,
          workspaceOwnerId: workspaceOwnerId!,
          googleSyncUserId: eventRow.google_sync_user_id as string | null,
          assignedTo: eventRow.assigned_to as string | null,
          preferActor: false,
        });

        const extraAttendees = await resolveAttendeeEmails(
          supabase,
          await listCalendarEventAttendees(supabase, id)
        );

        const contactId =
          (eventRow.contact_id as string | null) ??
          (existingRow?.contact_id as string | undefined) ??
          null;

        let primaryContactEmail: { email: string; displayName?: string } | null = null;
        if (contactId) {
          const { data: primaryContact } = await supabase
            .from("contacts")
            .select("email, first_name, last_name")
            .eq("id", contactId)
            .maybeSingle();
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
        }

        const googleAttendees = await buildGoogleSyncAttendees(supabase, {
          syncUserId,
          assigneeId: eventRow.assigned_to as string | null,
          primaryContact: primaryContactEmail,
          extraAttendees,
        });

        await updateGoogleCalendarEvent(syncUserId, String(eventRow.google_event_id), {
          title: String(eventRow.title),
          description: (eventRow.description as string | null) ?? null,
          location: (eventRow.location as string | null) ?? null,
          start_time: String(eventRow.start_time),
          end_time: String(eventRow.end_time),
          attendees: googleAttendees.length ? googleAttendees : undefined,
        });
      } catch (syncErr) {
        console.error("Google Calendar sync on update:", syncErr);
      }
    }

    void notifyAppointmentEvent(
      supabase,
      workspaceOwnerId!,
      "appointment.updated",
      eventRow
    );

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
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (existing?.google_event_id) {
      try {
        const syncUserId = await resolveGoogleSyncUserId(supabase, {
          actorUserId: userId!,
          workspaceOwnerId: workspaceOwnerId!,
          googleSyncUserId: (existing as { google_sync_user_id?: string }).google_sync_user_id,
          assignedTo: (existing as { assigned_to?: string }).assigned_to,
          preferActor: false,
        });
        await deleteGoogleCalendarEvent(
          syncUserId,
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

    if (existing) {
      void notifyAppointmentEvent(
        supabase,
        workspaceOwnerId!,
        "appointment.cancelled",
        existing as Record<string, unknown>
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/calendar/events/[id]:", err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
