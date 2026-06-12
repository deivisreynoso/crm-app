import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { allocateCustomerId } from "@/lib/contacts/customer-id";
import { recordAuditLog } from "@/lib/audit/record";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
  if (error) return error;

  const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
  if (manageError) return manageError;

  const { id } = await context.params;
  const supabase = createServerSideClient();

  const { data: contact, error: loadError } = await supabase
    .from("contacts")
    .select("id, customer_id, first_name, last_name")
    .eq("id", id)
    .eq("user_id", workspaceOwnerId!)
    .maybeSingle();

  if (loadError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.customer_id) {
    return NextResponse.json(
      { error: "Customer ID is already assigned and cannot be changed." },
      { status: 409 }
    );
  }

  const customerId = await allocateCustomerId(supabase, workspaceOwnerId!);

  const { data: updated, error: updateError } = await supabase
    .from("contacts")
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", workspaceOwnerId!)
    .is("customer_id", null)
    .select("customer_id")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Could not assign customer ID." },
      { status: 500 }
    );
  }

  await recordAuditLog({
    workspaceOwnerId: workspaceOwnerId!,
    actorUserId: userId!,
    action: "contact.customer_id_assigned",
    entityType: "contact",
    entityId: id,
    entityName: `${contact.first_name} ${contact.last_name}`.trim(),
    newValues: { customer_id: customerId },
    req,
  });

  return NextResponse.json({ customer_id: updated.customer_id });
}
