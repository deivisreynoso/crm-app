import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { deleteContactWithDependents } from "@/lib/contacts/delete-contact";
import { createServerSideClient } from "@/lib/supabase";
import { contactPatchSchema } from "@/lib/validators";
import { buildContactPatchUpdates } from "@/lib/contacts/patch-contact-updates";
import { enrichContactsCompanyNamesFromDb } from "@/lib/contacts/resolve-company-display";
import { triggerN8NWebhook } from "@/lib/n8n";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import {
  duplicateContactMessage,
  findDuplicateContact,
} from "@/lib/identity/contact-duplicate";
import { contactWriteErrorMessage } from "@/lib/identity/duplicate-errors";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";
import { recordAuditLog } from "@/lib/audit/record";
import { allocateCustomerId } from "@/lib/contacts/customer-id";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const [enriched] = await enrichContactsCompanyNamesFromDb(
      supabase,
      workspaceOwnerId!,
      [data]
    );

    return NextResponse.json(enriched);
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
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
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
      const duplicate = await findDuplicateContact(supabase, workspaceOwnerId!, {
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
      ...(await buildContactPatchUpdates(
        supabase,
        workspaceOwnerId!,
        parsed.data
      )),
      updated_at: new Date().toISOString(),
    };

    let { data, error: dbError } = await patchContact(supabase, id, workspaceOwnerId!,
      baseUpdates
    );

    if (
      dbError &&
      "country" in baseUpdates &&
      /country/i.test(dbError.message)
    ) {
      const { country: _c, ...withoutCountry } = baseUpdates;
      ({ data, error: dbError } = await patchContact(supabase, id, workspaceOwnerId!,
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

    if (
      parsed.data.status === "active" &&
      !data.customer_id
    ) {
      try {
        const customerId = await allocateCustomerId(supabase, workspaceOwnerId!);
        const { data: withCid } = await patchContact(supabase, id, workspaceOwnerId!, {
          customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
        if (withCid) {
          Object.assign(data, withCid);
        }
      } catch (cidErr) {
        console.error("auto-assign customer_id on active:", cidErr);
      }
    }

    await triggerN8NWebhook("contact.updated", data);

    const changedKeys = Object.keys(parsed.data).filter(
      (k) => parsed.data[k as keyof typeof parsed.data] !== undefined
    );
    if (changedKeys.length > 0) {
      await logContactActivity(supabase, {
        userId: workspaceOwnerId!,
        createdBy: userId,
        contactId: id,
        type: "update",
        description: `Contact updated: ${changedKeys.slice(0, 5).join(", ")}${changedKeys.length > 5 ? "…" : ""}`,
        metadata: { fields: changedKeys },
      });
    }

    const [enriched] = await enrichContactsCompanyNamesFromDb(
      supabase,
      workspaceOwnerId!,
      [data]
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("PATCH /api/contacts/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data, error: dbError } = await deleteContactWithDependents(
      supabase,
      workspaceOwnerId!,
      id
    );

    if (dbError) {
      if (dbError.code === "NOT_FOUND") {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      if (dbError.code === "CONTACT_HAS_INVOICES") {
        return NextResponse.json({ error: dbError.message }, { status: 409 });
      }
      console.error("DELETE /api/contacts/[id] db:", dbError);
      const message = humanizeDbError(dbError.message);
      const status = /foreign key|violates/i.test(dbError.message) ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    if (!data) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contactName =
      `${String(data.first_name ?? "")} ${String(data.last_name ?? "")}`.trim() ||
      "Contact";

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "contact.deleted",
      entityType: "contact",
      entityId: id,
      entityName: contactName,
      changeSummary: `Deleted contact ${contactName}`,
      req,
    });

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
