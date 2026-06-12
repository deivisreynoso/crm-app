import type { SupabaseClient } from "@supabase/supabase-js";
import { pickNextCalendarColor, isGreyCalendarColor } from "@/lib/users/calendar-colors";

/** Assign a palette color to a user if they do not have one yet. */
export async function ensureUserCalendarColor(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("calendar_color")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.calendar_color?.trim() && !isGreyCalendarColor(existing.calendar_color)) return;

  const { data: used } = await supabase
    .from("user_profiles")
    .select("calendar_color")
    .not("calendar_color", "is", null);

  const usedColors = (used ?? [])
    .map((r) => r.calendar_color as string)
    .filter(Boolean);

  const color = pickNextCalendarColor(usedColors);

  await supabase
    .from("user_profiles")
    .update({ calendar_color: color, updated_at: new Date().toISOString() })
    .eq("id", userId);
}
