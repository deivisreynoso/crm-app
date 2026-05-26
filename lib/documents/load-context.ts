import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTemplateContext,
  interpolateTemplate,
  type TemplateContext,
} from "@/lib/documents/template-variables";
import { formatQuoteLineItemsHtml } from "@/lib/quotes/line-items-html";

export async function loadDocumentTemplateContext(
  supabase: SupabaseClient,
  doc: {
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    title?: string;
    valid_until?: string | null;
  }
): Promise<TemplateContext> {
  let contact = null;
  let company = null;
  let opportunity = null;

  if (doc.contact_id) {
    const { data } = await supabase
      .from("contacts")
      .select("first_name, last_name, email, phone, company")
      .eq("id", doc.contact_id)
      .maybeSingle();
    contact = data;
  }

  if (doc.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("name")
      .eq("id", doc.company_id)
      .maybeSingle();
    company = data;
  }

  if (doc.opportunity_id) {
    const { data } = await supabase
      .from("opportunities")
      .select("title, value, currency")
      .eq("id", doc.opportunity_id)
      .maybeSingle();
    opportunity = data;
  }

  return buildTemplateContext({
    contact: contact ?? undefined,
    company: company ?? undefined,
    opportunity: opportunity ?? undefined,
    document: { title: doc.title, valid_until: doc.valid_until ?? undefined },
  });
}

export async function resolveDocumentContent(
  supabase: SupabaseClient,
  doc: {
    id?: string;
    content?: string | null;
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    title?: string;
    valid_until?: string | null;
    header_html?: string | null;
    footer_html?: string | null;
    subtotal?: number | null;
    tax_rate?: number | null;
    tax_amount?: number | null;
    total_amount?: number | null;
  }
): Promise<string> {
  const ctx = await loadDocumentTemplateContext(supabase, doc);
  const raw = doc.content?.trim() ?? "";
  const body = raw ? interpolateTemplate(raw, ctx) : "";

  const footer = doc.footer_html?.trim()
    ? interpolateTemplate(doc.footer_html, ctx)
    : "";

  let lineBlock = "";
  if (doc.id) {
    const { data: lines } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("document_id", doc.id)
      .order("sort_order");
    if (lines && lines.length > 0) {
      lineBlock = formatQuoteLineItemsHtml(lines, {
        subtotal: Number(doc.subtotal) || 0,
        tax_rate: Number(doc.tax_rate) || 0,
        tax_amount: Number(doc.tax_amount) || 0,
        total_amount: Number(doc.total_amount) || 0,
      });
    }
  }

  return [body, lineBlock, footer].filter(Boolean).join("\n\n");
}
