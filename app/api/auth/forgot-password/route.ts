import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { passwordResetCallbackUrl } from "@/lib/auth/app-url";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Auth is not configured on the server." },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const redirectTo = passwordResetCallbackUrl(req.url);

    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email.trim().toLowerCase(),
      { redirectTo }
    );

    if (error) {
      console.error("POST /api/auth/forgot-password:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, we sent a link to reset your password.",
    });
  } catch (err) {
    console.error("POST /api/auth/forgot-password:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
