import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { contactSchema } from "@/lib/validators";
import { buildContactRecord, buildContactUpdate } from "@/lib/contact-payload";
import { triggerN8NWebhook } from "@/lib/n8n";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/contacts/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = contactSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const updates = {
      ...buildContactUpdate(parsed.data),
      updated_at: new Date().toISOString(),
    };

    const { data, error: dbError } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await triggerN8NWebhook("contact.updated", data);

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/contacts/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await triggerN8NWebhook("contact.deleted", data);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/contacts/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
