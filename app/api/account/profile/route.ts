import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { humanizeDbError } from "@/lib/validation-errors";

const schema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { error: authError } = await supabase.auth.admin.updateUserById(userId!, {
      email: parsed.data.email,
      user_metadata: { full_name: parsed.data.full_name },
    });

    if (authError) {
      return NextResponse.json(
        { error: humanizeDbError(authError.message) },
        { status: 400 }
      );
    }

    await supabase.from("user_profiles").upsert({
      id: userId!,
      email: parsed.data.email,
      display_name: parsed.data.full_name,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/account/profile:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
