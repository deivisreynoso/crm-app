import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { verifyContactInWorkspace } from "@/lib/contacts/verify-contact-ownership";
import { noteUpdateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string; noteId: string }> };

async function fetchContactNote(
  workspaceOwnerId: string,
  contactId: string,
  noteId: string
) {
  const supabase = createServerSideClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", workspaceOwnerId)
    .eq("entity_type", "contact")
    .eq("entity_id", contactId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id: contactId, noteId } = await context.params;
    if (!(await verifyContactInWorkspace(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const existing = await fetchContactNote(workspaceOwnerId!, contactId, noteId);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = noteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.content !== undefined) patch.content = parsed.data.content;
    if (parsed.data.activity_type !== undefined) {
      patch.activity_type = parsed.data.activity_type;
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("notes")
      .update(patch)
      .eq("id", noteId)
      .eq("user_id", workspaceOwnerId!)
      .eq("entity_type", "contact")
      .eq("entity_id", contactId)
      .select()
      .single();

    if (dbError) throw dbError;
    if (!data) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/contacts/[id]/notes/[noteId] error:", err);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id: contactId, noteId } = await context.params;
    if (!(await verifyContactInWorkspace(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const existing = await fetchContactNote(workspaceOwnerId!, contactId, noteId);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", workspaceOwnerId!)
      .eq("entity_type", "contact")
      .eq("entity_id", contactId);

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/contacts/[id]/notes/[noteId] error:", err);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
