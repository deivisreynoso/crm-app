import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { emailTemplateSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("user_id", userId!)
      .order("name");

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/email-templates:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = emailTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationDetails(parsed.error.flatten()) || "Invalid input" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .insert({
        user_id: userId!,
        name: parsed.data.name.trim(),
        subject: parsed.data.subject.trim(),
        body: parsed.data.body,
        category: parsed.data.category?.trim() || null,
        is_default: parsed.data.is_default ?? false,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/email-templates:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
