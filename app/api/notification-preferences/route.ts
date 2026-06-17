import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { notificationPreferencesSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";
import { AUTO_DISPLAY_TIMEZONE } from "@/lib/constants/display-timezones";

const DEFAULTS = {
  task_reminders: true,
  opportunity_reminders: true,
  ticket_notifications: true,
  email_notifications: true,
  conversation_notifications: true,
  sales_notifications: true,
  support_notifications: true,
  email_frequency: "daily",
  timezone: AUTO_DISPLAY_TIMEZONE,
};

function newPreferencesRow(
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    ...DEFAULTS,
    ...overrides,
  };
}

export async function GET() {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    let { data, error: dbError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId!)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    if (!data) {
      const { data: created, error: insertError } = await supabase
        .from("notification_preferences")
        .insert(newPreferencesRow(userId!))
        .select()
        .single();
      if (insertError) {
        return NextResponse.json(
          {
            error: humanizeDbError(insertError.message),
            hint: "Run migration 010_phase3_mvp_foundation.sql in Supabase.",
          },
          { status: 500 }
        );
      }
      data = created;
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/notification-preferences:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = notificationPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationDetails(parsed.error.flatten()) || "Invalid input" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.timezone !== undefined) {
      const tz = parsed.data.timezone?.trim();
      updates.timezone = tz || AUTO_DISPLAY_TIMEZONE;
    }

    const { data: existing, error: fetchError } = await supabase
      .from("notification_preferences")
      .select("id")
      .eq("user_id", userId!)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: humanizeDbError(fetchError.message) },
        { status: 500 }
      );
    }

    const { data, error: dbError } = existing
      ? await supabase
          .from("notification_preferences")
          .update(updates)
          .eq("user_id", userId!)
          .select()
          .single()
      : await supabase
          .from("notification_preferences")
          .insert(newPreferencesRow(userId!, updates))
          .select()
          .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/notification-preferences:", err);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
