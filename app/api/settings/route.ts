import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

const settingsPatchSchema = z.object({
  default_currency: z.enum(["USD", "MXN"]),
});

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    let { data, error: dbError } = await supabase
      .from("user_settings")
      .select("default_currency, updated_at")
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
        .from("user_settings")
        .insert({ user_id: userId!, default_currency: "USD" })
        .select("default_currency, updated_at")
        .single();

      if (insertError) {
        return NextResponse.json(
          {
            error: humanizeDbError(insertError.message),
            hint: "Run migration 014_user_settings.sql in Supabase.",
          },
          { status: 500 }
        );
      }
      data = created;
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/settings:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = settingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Invalid settings" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: userId!,
          default_currency: parsed.data.default_currency,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("default_currency, updated_at")
      .single();

    if (dbError) {
      return NextResponse.json(
        {
          error: humanizeDbError(dbError.message),
          hint: "Run migration 014_user_settings.sql in Supabase.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/settings:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
