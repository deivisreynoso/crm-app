import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { notificationPreferencesSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

const DEFAULTS = {
  task_reminders: true,
  opportunity_reminders: true,
  ticket_notifications: true,
  email_frequency: "daily",
  timezone: "UTC",
};

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
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
        .insert({ user_id: userId!, ...DEFAULTS })
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
    const { userId, error } = await requireAuth();
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
    const { data, error: dbError } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId!,
          ...DEFAULTS,
          ...parsed.data,
          timezone: parsed.data.timezone?.trim() || DEFAULTS.timezone,
        },
        { onConflict: "user_id" }
      )
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
