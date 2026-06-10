import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { humanizeDbError } from "@/lib/validation-errors";

const schema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, session, error } = await requireAuth();
    if (error) return error;

    const email = session!.user?.email;
    if (!email) {
      return NextResponse.json({ error: "No email on session" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.current_password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const authUserId = session!.user?.authUserId ?? userId!;

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
      password: parsed.data.new_password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: humanizeDbError(updateError.message) },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/account/password:", err);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
