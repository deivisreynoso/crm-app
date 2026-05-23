import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { contactSchema } from "@/lib/validators";
import { buildContactRecord } from "@/lib/contact-payload";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  duplicateContactMessage,
  findDuplicateContact,
} from "@/lib/identity/contact-duplicate";
import { contactWriteErrorMessage } from "@/lib/identity/duplicate-errors";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const createdFrom = searchParams.get("created_from");
    const createdTo = searchParams.get("created_to");

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

    const { data, error: dbError, count } = await query.range(from, to);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

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
      { error: "We could not load contacts. Please try again." },
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
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Please check the form and try again.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const duplicate = await findDuplicateContact(supabase, userId!, {
      email: parsed.data.email,
      phone: parsed.data.phone,
    });

    if (duplicate) {
      return NextResponse.json(
        { error: duplicateContactMessage(duplicate) },
        { status: 409 }
      );
    }

    const payload = buildContactRecord(parsed.data, userId!);

    const { data, error: dbError } = await supabase
      .from("contacts")
      .insert([payload])
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(contactWriteErrorMessage(dbError)) },
        { status: 500 }
      );
    }

    await triggerN8NWebhook("contact.created", data);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/contacts error:", err);
    return NextResponse.json(
      { error: "We could not create this contact. Please try again." },
      { status: 500 }
    );
  }
}
