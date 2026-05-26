import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { contactsToCsv } from "@/lib/contacts/csv";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

const MAX_EXPORT = 10_000;
const PAGE_SIZE = 500;

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const createdFrom = searchParams.get("created_from");
    const createdTo = searchParams.get("created_to");

    const supabase = createServerSideClient();
    const all: Record<string, unknown>[] = [];
    let from = 0;

    while (all.length < MAX_EXPORT) {
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("contacts")
        .select("*")
        .eq("user_id", workspaceOwnerId!)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);
      if (createdFrom) {
        query = query.gte("created_at", `${createdFrom}T00:00:00.000Z`);
      }
      if (createdTo) {
        query = query.lte("created_at", `${createdTo}T23:59:59.999Z`);
      }
      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
        );
      }

      const { data, error: dbError } = await query.range(from, to);
      if (dbError) {
        return NextResponse.json(
          { error: humanizeDbError(dbError.message) },
          { status: 500 }
        );
      }

      const batch = data ?? [];
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const csv = contactsToCsv(all);
    const filename = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("GET /api/contacts/export:", err);
    return NextResponse.json(
      { error: "Failed to export contacts" },
      { status: 500 }
    );
  }
}
