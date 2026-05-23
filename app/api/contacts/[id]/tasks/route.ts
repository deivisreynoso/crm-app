import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { taskSchema } from "@/lib/validators";
import { createNotification } from "@/lib/notifications/create-notification";

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
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    if (!(await verifyContactOwnership(userId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId!)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });

    if (dbError) throw dbError;

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/contacts/[id]/tasks error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    if (!(await verifyContactOwnership(userId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = {
      ...parsed.data,
      contact_id: contactId,
      user_id: userId,
      due_date: parsed.data.due_date || null,
      description: parsed.data.description || null,
    };

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tasks")
      .insert([payload])
      .select()
      .single();

    if (dbError) throw dbError;

    await createNotification(supabase, userId!, {
      kind: "task_reminder",
      title: "Task created",
      message: parsed.data.title,
      related_entity_type: "contact",
      related_entity_id: contactId,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/contacts/[id]/tasks error:", err);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
