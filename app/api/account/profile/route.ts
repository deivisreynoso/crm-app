import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { isValidCalendarColor } from "@/lib/users/calendar-colors";
import { humanizeDbError } from "@/lib/validation-errors";

const patchSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  email_signature_html: z.string().max(20000).optional().or(z.literal("")),
  calendar_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .refine((v) => isValidCalendarColor(v), {
      message: "Choose a non-grey color from the calendar palette",
    })
    .optional()
    .or(z.literal("")),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("email, display_name, email_signature_html, calendar_color")
    .eq("id", userId!)
    .maybeSingle();

  return NextResponse.json({
    full_name: data?.display_name ?? "",
    email: data?.email ?? "",
    email_signature_html: data?.email_signature_html ?? "",
    calendar_color: data?.calendar_color ?? "",
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, session, error } = await requireAuth();
    if (error) return error;

    const authUserId = session!.user?.authUserId ?? userId!;

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const supabase = createServerSideClient();

    if (parsed.data.email || parsed.data.full_name) {
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("email, display_name")
        .eq("id", userId!)
        .maybeSingle();

      const { error: authError } = await supabase.auth.admin.updateUserById(authUserId, {
        email: parsed.data.email ?? existing?.email,
        user_metadata: {
          full_name: parsed.data.full_name ?? existing?.display_name,
        },
      });

      if (authError) {
        return NextResponse.json(
          { error: humanizeDbError(authError.message) },
          { status: 400 }
        );
      }
    }

    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("email, display_name, email_signature_html, calendar_color")
      .eq("id", userId!)
      .maybeSingle();

    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        id: userId!,
        email: parsed.data.email ?? existingProfile?.email,
        display_name: parsed.data.full_name ?? existingProfile?.display_name,
        email_signature_html:
          parsed.data.email_signature_html !== undefined
            ? parsed.data.email_signature_html === ""
              ? null
              : parsed.data.email_signature_html
            : existingProfile?.email_signature_html,
        calendar_color:
          parsed.data.calendar_color !== undefined
            ? parsed.data.calendar_color === ""
              ? null
              : parsed.data.calendar_color
            : existingProfile?.calendar_color,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/account/profile:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
