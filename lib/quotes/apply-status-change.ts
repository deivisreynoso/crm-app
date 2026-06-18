import type { SupabaseClient } from "@supabase/supabase-js";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { isQuoteDocument } from "@/lib/documents/kinds";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  emailSalesGroup,
  notifySalesGroupInApp,
  salesQuoteResponseGroupEmail,
} from "@/lib/notifications/workspace-groups";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { closeWonOpportunityForInvoice } from "@/lib/opportunities/close-won";

export type QuoteStatus = "draft" | "sent" | "signed" | "accepted" | "rejected";

export type QuoteStatusChangeInput = {
  status: QuoteStatus;
  loss_reason?: string | null;
  loss_reason_notes?: string | null;
  /** Who recorded the change (CRM user name or customer). */
  response_name?: string | null;
  response_email?: string | null;
};

/** Extra document columns when status changes (manual CRM or public accept). */
export function buildQuoteStatusPatch(
  previousStatus: string | null | undefined,
  input: QuoteStatusChangeInput
): Record<string, unknown> {
  const now = new Date().toISOString();
  const next = input.status;
  const prev = previousStatus ?? "draft";

  const patch: Record<string, unknown> = {
    status: next,
    updated_at: now,
  };

  if (next === "accepted" || next === "signed") {
    patch.accepted_at = now;
    patch.signed_at = now;
    patch.rejected_at = null;
    if (next === "accepted") {
      patch.acceptance_disclaimer_acknowledged_at =
        patch.acceptance_disclaimer_acknowledged_at ?? now;
    }
  } else if (next === "rejected") {
    patch.rejected_at = now;
    patch.accepted_at = null;
    patch.signed_at = null;
    if (input.loss_reason !== undefined) {
      patch.loss_reason = input.loss_reason?.trim() || null;
    }
    if (input.loss_reason_notes !== undefined) {
      patch.loss_reason_notes = input.loss_reason_notes?.trim() || null;
    }
  } else if (next === "sent" && prev === "draft") {
    patch.sent_at = patch.sent_at ?? now;
  } else if (next === "draft") {
    patch.rejected_at = null;
  }

  if (input.response_name !== undefined) {
    patch.response_name = input.response_name?.trim() || null;
  }
  if (input.response_email !== undefined) {
    patch.response_email = input.response_email?.trim().toLowerCase() || null;
  }

  return patch;
}

export async function runQuoteStatusSideEffects(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  doc: Record<string, unknown>,
  input: QuoteStatusChangeInput,
  options?: { manual?: boolean }
): Promise<void> {
  if (!isQuoteDocument(doc.type as string)) return;

  const contactId = doc.contact_id as string | null | undefined;
  const quoteRef = (doc.quote_reference as string) || (doc.title as string);
  const documentId = doc.id as string;

  if (input.status === "accepted") {
    if (contactId) {
      await logContactActivity(supabase, {
        userId: workspaceOwnerId,
        contactId,
        type: "system",
        description: `Quote ${quoteRef} accepted${
          input.response_name ? ` by ${input.response_name}` : options?.manual ? " (manual)" : ""
        }`,
        metadata: {
          document_id: documentId,
          action: "accept",
          manual: Boolean(options?.manual),
        },
      });

      void closeWonOpportunityForInvoice(supabase, workspaceOwnerId, {
        contact_id: contactId,
        document_id: documentId,
        invoice_total: Number(doc.total_amount) || 0,
      }).catch((err) => console.warn("quote accept close-won:", err));
    }

    const updated = { ...doc, status: "accepted" };
    void triggerN8NWebhook("quote.accepted", updated);
    void fireWebhook(supabase, workspaceOwnerId, "quote.accepted", {
      document_id: documentId,
      document: updated,
      manual: Boolean(options?.manual),
      response_name: input.response_name ?? null,
      response_email: input.response_email ?? null,
    });

    void notifySalesGroupInApp(supabase, workspaceOwnerId, {
      kind: "sales_quote_accepted",
      title: `Quote ${quoteRef} accepted`,
      message: input.response_name ?? input.response_email ?? undefined,
      related_entity_type: "document",
      related_entity_id: documentId,
    });

    const mail = salesQuoteResponseGroupEmail({
      quoteReference: quoteRef,
      action: "accepted",
      responseName: input.response_name ?? null,
      responseEmail: input.response_email ?? null,
      documentId,
    });
    void emailSalesGroup(
      supabase,
      workspaceOwnerId,
      mail.subject,
      mail.html,
      mail.text
    );
  }

  if (input.status === "rejected") {
    if (contactId) {
      await logContactActivity(supabase, {
        userId: workspaceOwnerId,
        contactId,
        type: "system",
        description: `Quote ${quoteRef} declined${
          input.response_name ? ` by ${input.response_name}` : options?.manual ? " (manual)" : ""
        }`,
        metadata: {
          document_id: documentId,
          action: "reject",
          loss_reason: input.loss_reason ?? null,
          manual: Boolean(options?.manual),
        },
      });
    }

    void triggerN8NWebhook("quote.rejected", { ...doc, status: "rejected" });

    void notifySalesGroupInApp(supabase, workspaceOwnerId, {
      kind: "sales_quote_declined",
      title: `Quote ${quoteRef} declined`,
      message: input.response_name ?? input.response_email ?? undefined,
      related_entity_type: "document",
      related_entity_id: documentId,
    });

    const mail = salesQuoteResponseGroupEmail({
      quoteReference: quoteRef,
      action: "declined",
      responseName: input.response_name ?? null,
      responseEmail: input.response_email ?? null,
      documentId,
    });
    void emailSalesGroup(
      supabase,
      workspaceOwnerId,
      mail.subject,
      mail.html,
      mail.text
    );
  }
}
