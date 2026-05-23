import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";

const companySchema = z.object({
  name: z.string().min(1),
  website: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  company_size: z.string().optional().or(z.literal("")),
  revenue: z.string().optional().or(z.literal("")),
  account_summary: z.string().optional().or(z.literal("")),
});

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId!)
      .order("name", { ascending: true });

    if (dbError) throw dbError;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/companies error:", err);
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
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("companies")
      .insert([
        {
          user_id: userId!,
          name: parsed.data.name.trim(),
          website: emptyToNull(parsed.data.website),
          phone: emptyToNull(parsed.data.phone),
          industry: emptyToNull(parsed.data.industry),
          company_size: emptyToNull(parsed.data.company_size),
          revenue: emptyToNull(parsed.data.revenue),
          account_summary: emptyToNull(parsed.data.account_summary),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("POST company db error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/companies error:", err);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
