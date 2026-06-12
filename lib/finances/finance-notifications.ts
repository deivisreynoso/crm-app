import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications/create-notification";

export async function notifyPaymentReceived(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string,
  invoiceNumber: string
) {
  await createNotification(supabase, workspaceOwnerId, {
    kind: "finance_payment_received",
    title: `Payment received on invoice ${invoiceNumber}`,
    related_entity_type: "invoice",
    related_entity_id: invoiceId,
  });
}

export async function notifyInvoiceOverdue(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string,
  invoiceNumber: string
) {
  await createNotification(supabase, workspaceOwnerId, {
    kind: "finance_invoice_overdue",
    title: `Invoice ${invoiceNumber} is overdue`,
    message: "Follow up with the customer or send a reminder.",
    related_entity_type: "invoice",
    related_entity_id: invoiceId,
  });
}
