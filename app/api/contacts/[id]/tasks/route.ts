import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { taskSchema } from "@/lib/validators";
import { createNotification } from "@/lib/notifications/create-notification";
import { logContactActivity } from "@/lib/activities/log-contact-activity";

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

function buildDueFields(due_at?: string, due_date?: string) {
  if (due_at?.trim()) {
    const at = due_at.trim();
    return { due_at: at, due_date: at.slice(0, 10) };
  }
  if (due_date?.trim()) {
    return { due_at: `${due_date.trim()}T12:00:00.000Z`, due_date: due_date.trim() };
  }
  return { due_at: null, due_date: null };
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

    const dueFields = buildDueFields(parsed.data.due_at, parsed.data.due_date);
    const assignee = parsed.data.assigned_to?.trim() || userId!;

    const payload = {
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      contact_id: contactId,
      user_id: userId,
      assigned_to: assignee,
      ...dueFields,
    };

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tasks")
      .insert([payload])
      .select()
      .single();

    if (dbError) throw dbError;

    await logContactActivity(supabase, {
      userId: userId!,
      contactId,
      type: "task",
      description: `Task created: ${parsed.data.title}`,
      metadata: { task_id: data.id },
    });

    const notifyUserId = assignee !== userId ? assignee : userId!;
    await createNotification(supabase, notifyUserId, {
      kind: "task_reminder",
      title: "Task assigned",
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
