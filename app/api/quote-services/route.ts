import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  unit_price: z.coerce.number().nonnegative(),
  currency: z.string().optional().default("USD"),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("quote_services")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("name");

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/quote-services:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;
    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const parsed = serviceSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatValidationDetails(parsed.error.flatten()) || "Invalid input",
        },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("quote_services")
      .insert([
        {
          user_id: workspaceOwnerId!,
          name: parsed.data.name.trim(),
          description: parsed.data.description?.trim() || null,
          unit_price: parsed.data.unit_price,
          currency: parsed.data.currency || "USD",
          active: parsed.data.active ?? true,
        },
      ])
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
    console.error("POST /api/quote-services:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
