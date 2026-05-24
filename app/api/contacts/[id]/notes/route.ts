import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { noteSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

async function verifyContactOwnership(userId: string, contactId: string) {
  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    if (!(await verifyContactOwnership(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .eq("entity_type", "contact")
      .eq("entity_id", contactId)
      .order("created_at", { ascending: false });

    if (dbError) throw dbError;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/contacts/[id]/notes error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    if (!(await verifyContactOwnership(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("notes")
      .insert([
        {
          user_id: workspaceOwnerId,
          entity_type: "contact",
          entity_id: contactId,
          content: parsed.data.content,
          activity_type: parsed.data.activity_type,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/contacts/[id]/notes error:", err);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
