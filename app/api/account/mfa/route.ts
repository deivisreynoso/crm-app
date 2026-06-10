import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";

const schema = z.object({
  enabled: z.boolean(),
});

/** MFA preference flag (Supabase TOTP enrollment UI can be added when enabled). */
export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("mfa_enabled")
    .eq("id", userId!)
    .maybeSingle();

  return NextResponse.json({ enabled: Boolean(data?.mfa_enabled) });
}

export async function PATCH(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createServerSideClient();
  const { error: dbError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        id: userId!,
        mfa_enabled: parsed.data.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ enabled: parsed.data.enabled });
}
