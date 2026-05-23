import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("payments")
      .select(
        `
        *,
        contact:contacts(id, first_name, last_name),
        opportunity:opportunities(id, title)
      `
      )
      .eq("user_id", userId!)
      .order("created_at", { ascending: false })
      .limit(100);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/payments:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
