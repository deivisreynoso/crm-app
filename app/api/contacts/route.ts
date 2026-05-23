import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { contactSchema } from "@/lib/validators";
import { buildContactRecord } from "@/lib/contact-payload";
import { triggerN8NWebhook } from "@/lib/n8n";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createServerSideClient();
    let query = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
      );
    }

    const { data, error: dbError, count } = await query.range(from, to);

    if (dbError) throw dbError;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
      },
    });
  } catch (err) {
    console.error("GET /api/contacts error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = buildContactRecord(parsed.data, userId!);

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("contacts")
      .insert([payload])
      .select()
      .single();

    if (dbError) throw dbError;

    await triggerN8NWebhook("contact.created", data);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/contacts error:", err);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
