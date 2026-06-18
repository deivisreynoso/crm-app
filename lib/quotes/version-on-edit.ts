import type { SupabaseClient } from "@supabase/supabase-js";
import { isQuoteDocument } from "@/lib/documents/kinds";
import { ensureQuoteReference } from "@/lib/quotes/reference";

const VERSIONABLE_STATUSES = new Set(["sent", "accepted"]);

/** When editing a sent/accepted quote, fork a new draft revision linked to the parent. */
export async function forkQuoteRevisionIfNeeded(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  existing: Record<string, unknown>
): Promise<{ documentId: string; forked: boolean }> {
  const status = existing.status as string;
  if (!isQuoteDocument(existing.type as string) || !VERSIONABLE_STATUSES.has(status)) {
    return { documentId: existing.id as string, forked: false };
  }

  const parentId = (existing.parent_document_id as string | null) ?? (existing.id as string);
  const currentVersion = Number(existing.version) || 1;
  const nextVersion = currentVersion + 1;

  const { data: created, error } = await supabase
    .from("documents")
    .insert({
      user_id: workspaceOwnerId,
      contact_id: existing.contact_id,
      company_id: existing.company_id,
      opportunity_id: existing.opportunity_id,
      type: existing.type,
      title: existing.title,
      content: existing.content,
      status: "draft",
      valid_until: existing.valid_until,
      subtotal: existing.subtotal,
      tax_rate: existing.tax_rate,
      tax_amount: existing.tax_amount,
      total_amount: existing.total_amount,
      header_html: existing.header_html,
      footer_html: existing.footer_html,
      currency: existing.currency,
      version: nextVersion,
      parent_document_id: parentId,
      quote_reference: null,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create quote revision");
  }

  const { data: lineItems } = await supabase
    .from("quote_line_items")
    .select("*")
    .eq("document_id", existing.id as string)
    .order("sort_order");

  if (lineItems?.length) {
    await supabase.from("quote_line_items").insert(
      lineItems.map((line, index) => ({
        document_id: created.id,
        user_id: workspaceOwnerId,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
        sort_order: line.sort_order ?? index,
        service_id: line.service_id,
      }))
    );
  }

  await ensureQuoteReference(supabase, {
    id: created.id,
    user_id: workspaceOwnerId,
    type: existing.type as string,
    quote_reference: existing.quote_reference as string | null,
  });

  return { documentId: created.id as string, forked: true };
}
