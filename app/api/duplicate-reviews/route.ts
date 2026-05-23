import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { scanContactDuplicates } from "@/lib/duplicates/scan-contacts";
import { humanizeDbError } from "@/lib/validation-errors";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const status = new URL(req.url).searchParams.get("status") ?? "pending";
    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("duplicate_reviews")
      .select(
        `
        *,
        contact1:contacts!duplicate_reviews_contact1_id_fkey(id, first_name, last_name, email, phone),
        contact2:contacts!duplicate_reviews_contact2_id_fkey(id, first_name, last_name, email, phone)
      `
      )
      .eq("user_id", userId!)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (dbError) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("duplicate_reviews")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (fallbackError) {
        return NextResponse.json(
          { error: humanizeDbError(fallbackError.message) },
          { status: 500 }
        );
      }

      const enriched = await enrichContacts(supabase, fallback ?? []);
      return NextResponse.json({ data: enriched });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/duplicate-reviews:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function enrichContacts(
  supabase: ReturnType<typeof createServerSideClient>,
  reviews: Array<Record<string, unknown>>
) {
  const ids = new Set<string>();
  for (const r of reviews) {
    if (r.contact1_id) ids.add(r.contact1_id as string);
    if (r.contact2_id) ids.add(r.contact2_id as string);
  }
  if (ids.size === 0) return reviews;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone")
    .in("id", [...ids]);

  const map = Object.fromEntries((contacts ?? []).map((c) => [c.id, c]));

  return reviews.map((r) => ({
    ...r,
    contact1: map[r.contact1_id as string] ?? null,
    contact2: map[r.contact2_id as string] ?? null,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    if (body.action !== "scan") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const result = await scanContactDuplicates(supabase, userId!);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/duplicate-reviews:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    );
  }
}
