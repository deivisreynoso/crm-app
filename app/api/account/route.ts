import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

export async function DELETE() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();

    const tables = [
      "contacts",
      "companies",
      "opportunities",
      "tickets",
      "tasks",
      "notes",
      "activities",
      "documents",
      "payments",
      "pipelines",
      "notifications",
      "notification_preferences",
      "saved_filters",
      "duplicate_reviews",
      "email_templates",
      "contact_tags",
      "custom_fields",
      "calendar_events",
      "team_members",
      "user_settings",
    ] as const;

    for (const table of tables) {
      const { error: delError } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId!);
      if (delError && !/does not exist/i.test(delError.message)) {
        console.error(`delete ${table}:`, delError.message);
      }
    }

    await supabase.from("team_members").delete().eq("owner_user_id", userId!);
    await supabase.from("user_profiles").delete().eq("id", userId!);

    const { error: authError } = await supabase.auth.admin.deleteUser(userId!);
    if (authError) {
      return NextResponse.json(
        { error: humanizeDbError(authError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/account:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
