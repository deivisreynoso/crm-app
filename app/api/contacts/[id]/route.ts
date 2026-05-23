import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { contactPatchSchema } from "@/lib/validators";
import { buildContactUpdate } from "@/lib/contact-payload";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  duplicateContactMessage,
  findDuplicateContact,
} from "@/lib/identity/contact-duplicate";
import { contactWriteErrorMessage } from "@/lib/identity/duplicate-errors";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

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

async function patchContact(
  supabase: ReturnType<typeof createServerSideClient>,
  id: string,
  userId: string,
  updates: Record<string, unknown>
) {
  return supabase
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = contactPatchSchema.safeParse(body);

    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();

    if (parsed.data.email !== undefined || parsed.data.phone !== undefined) {
      const duplicate = await findDuplicateContact(supabase, userId!, {
        email: parsed.data.email,
        phone: parsed.data.phone,
        excludeId: id,
      });
      if (duplicate) {
        return NextResponse.json(
          { error: duplicateContactMessage(duplicate) },
          { status: 409 }
        );
      }
    }

    const baseUpdates = {
      ...buildContactUpdate(parsed.data),
      updated_at: new Date().toISOString(),
    };

    let { data, error: dbError } = await patchContact(
      supabase,
      id,
      userId!,
      baseUpdates
    );

    if (
      dbError &&
      "country" in baseUpdates &&
      /country/i.test(dbError.message)
    ) {
      const { country: _c, ...withoutCountry } = baseUpdates;
      ({ data, error: dbError } = await patchContact(
        supabase,
        id,
        userId!,
        withoutCountry
      ));
    }

    if (dbError) {
      console.error("PATCH /api/contacts/[id] db:", dbError);
      return NextResponse.json(
        {
          error: humanizeDbError(contactWriteErrorMessage(dbError)),
          hint: /country/i.test(dbError.message)
            ? "Run migrations/009_contact_country.sql in Supabase if updating country."
            : undefined,
        },
        { status: 500 }
      );
    }

    if (!data) {
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
