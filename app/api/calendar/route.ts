import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { calendarEventSchema } from "@/lib/validators";

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const supabase = createServerSideClient();
    let query = supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId!)
      .order("start_time", { ascending: true });

    const contactId = params.get("contact_id");
    const companyId = params.get("company_id");
    if (contactId) query = query.eq("contact_id", contactId);
    if (companyId) query = query.eq("company_id", companyId);

    const { data, error: dbError } = await query;
    if (dbError) throw dbError;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/calendar error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = calendarEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("calendar_events")
      .insert([
        {
          user_id: userId!,
          contact_id: parsed.data.contact_id?.trim() || null,
          company_id: parsed.data.company_id?.trim() || null,
          opportunity_id: parsed.data.opportunity_id?.trim() || null,
          title: parsed.data.title.trim(),
          description: emptyToNull(parsed.data.description),
          start_time: parsed.data.start_time,
          end_time: parsed.data.end_time,
          location: emptyToNull(parsed.data.location),
        },
      ])
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/calendar error:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
