import type { SupabaseClient } from "@supabase/supabase-js";
import { isQuoteDocument } from "@/lib/documents/kinds";
import { resolveCrmLocale } from "@/lib/crm/i18n";
import { resolveQuoteLogoUrl } from "@/lib/storage/quote-logo";
import type { QuoteLineItem } from "@/types";

export type PublicQuoteView = {
  id: string;
  title: string;
  quote_reference: string | null;
  status: string;
  valid_until: string | null;
  content: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  company_display_name: string | null;
  logo_url: string | null;
  locale: "en" | "es";
  line_items: QuoteLineItem[];
  accepted_at: string | null;
  rejected_at: string | null;
  response_name: string | null;
  response_email: string | null;
};

export async function loadPublicQuoteByToken(
  supabase: SupabaseClient,
  token: string
): Promise<PublicQuoteView | null> {
  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("accept_token", token.trim())
    .maybeSingle();

  if (error || !doc || !isQuoteDocument(doc.type as string)) return null;

  const { data: lines } = await supabase
    .from("quote_line_items")
    .select("*")
    .eq("document_id", doc.id)
    .order("sort_order");

  let contactLocale: string | null = null;
  if (doc.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("preferred_language")
      .eq("id", doc.contact_id)
      .maybeSingle();
    contactLocale = (contact?.preferred_language as string | null) ?? null;
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_currency, quote_company_name, quote_logo_storage_path, ui_locale")
    .eq("user_id", doc.user_id)
    .maybeSingle();

  const locale = resolveCrmLocale(contactLocale ?? (settings?.ui_locale as string | null));

  const logoUrl = await resolveQuoteLogoUrl(
    supabase,
    settings?.quote_logo_storage_path as string | null | undefined
  );

  const lineItems = (lines ?? []) as QuoteLineItem[];
  const subtotal =
    Number(doc.subtotal) ||
    lineItems.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const taxRate = Number(doc.tax_rate) || 0;
  const taxAmount = Number(doc.tax_amount) || 0;
  const totalAmount = Number(doc.total_amount) || subtotal + taxAmount;

  return {
    id: doc.id,
    title: doc.title as string,
    quote_reference: (doc.quote_reference as string | null) ?? null,
    status: doc.status as string,
    valid_until: (doc.valid_until as string | null) ?? null,
    content: (doc.content as string | null) ?? null,
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    currency: (settings?.default_currency as string) || "USD",
    company_display_name: (settings?.quote_company_name as string | null) ?? null,
    logo_url: logoUrl,
    locale,
    line_items: lineItems,
    accepted_at: (doc.accepted_at as string | null) ?? null,
    rejected_at: (doc.rejected_at as string | null) ?? null,
    response_name: (doc.response_name as string | null) ?? null,
    response_email: (doc.response_email as string | null) ?? null,
  };
}
