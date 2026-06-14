import type { SupabaseClient } from "@supabase/supabase-js";
import { fireWebhook } from "@/lib/webhooks/outbound";

export async function notifyInvoicePaid(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, contact:contacts(id, first_name, last_name, email, phone)")
    .eq("id", invoiceId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!invoice) return;

  void fireWebhook(supabase, workspaceOwnerId, "invoice.paid", {
    invoice_id: invoiceId,
    invoice,
    ...extra,
  });
}

export async function notifyAppointmentEvent(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  event: "appointment.created" | "appointment.updated" | "appointment.cancelled",
  calendarEvent: Record<string, unknown>
): Promise<void> {
  void fireWebhook(supabase, workspaceOwnerId, event, {
    calendar_event_id: calendarEvent.id,
    calendar_event: calendarEvent,
  });
}
