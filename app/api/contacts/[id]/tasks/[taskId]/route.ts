import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { taskSchema } from "@/lib/validators";
import { verifyContactInWorkspace } from "@/lib/contacts/verify-contact-ownership";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: contactId, taskId } = await context.params;
    if (!(await verifyContactInWorkspace(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("contact_id", contactId)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET task:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: contactId, taskId } = await context.params;
    if (!(await verifyContactInWorkspace(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = taskSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description || null;
    }
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;
    if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
    if (parsed.data.assigned_to !== undefined) {
      patch.assigned_to = parsed.data.assigned_to || null;
    }
    if (parsed.data.due_at !== undefined) {
      patch.due_at = parsed.data.due_at || null;
      patch.due_date = parsed.data.due_at
        ? parsed.data.due_at.slice(0, 10)
        : null;
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", taskId)
      .eq("contact_id", contactId)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH task:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
