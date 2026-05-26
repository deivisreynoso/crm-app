import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuotePdfLabels } from "@/lib/crm/quote-pdf-labels";
import { isQuoteDocument } from "@/lib/documents/kinds";
import { generateQuotePdf } from "@/lib/documents/quote-pdf";
import { generateTextPdf } from "@/lib/documents/pdf";
import { resolveQuoteLogoUrl } from "@/lib/storage/quote-logo";
import { ensureQuoteReference } from "@/lib/quotes/reference";
import type { QuoteLineItem } from "@/types";

function pdfFileName(title: string): string {
  const base = title.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_") || "document";
  return `${base}.pdf`;
}

async function fetchLogoBytes(
  logoUrl: string | null
): Promise<{ bytes: Uint8Array; mime: "png" | "jpg" } | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type.includes("png")) return { bytes: buf, mime: "png" };
    if (type.includes("jpeg") || type.includes("jpg")) return { bytes: buf, mime: "jpg" };
    if (buf[0] === 0x89 && buf[1] === 0x50) return { bytes: buf, mime: "png" };
    return { bytes: buf, mime: "jpg" };
  } catch {
    return null;
  }
}

/** Build a document PDF in memory (structured layout for quotes). */
export async function generateDocumentPdfBuffer(
  supabase: SupabaseClient,
  doc: {
    id?: string;
    type?: string;
    title: string;
    quote_reference?: string | null;
    content?: string | null;
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    valid_until?: string | null;
    header_html?: string | null;
    footer_html?: string | null;
    subtotal?: number | null;
    tax_rate?: number | null;
    tax_amount?: number | null;
    total_amount?: number | null;
    user_id?: string;
  },
  workspaceOwnerId: string
): Promise<{ buffer: Buffer; fileName: string }> {
  if (isQuoteDocument(doc.type)) {
    const { data: lines } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("document_id", doc.id!)
      .order("sort_order");

    let contact: QuotePdfContact | null = null;
    if (doc.contact_id) {
      const { data } = await supabase
        .from("contacts")
        .select("first_name, last_name, email, phone")
        .eq("id", doc.contact_id)
        .maybeSingle();
      contact = data;
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select(
        "default_currency, quote_company_name, quote_logo_storage_path, ui_locale"
      )
      .eq("user_id", workspaceOwnerId)
      .maybeSingle();

    const uiLocale = (settings?.ui_locale as string | null) ?? null;
    const quoteReference =
      doc.quote_reference?.trim() ||
      (doc.id
        ? await ensureQuoteReference(supabase, {
            id: doc.id,
            user_id: workspaceOwnerId,
            type: doc.type!,
            quote_reference: doc.quote_reference,
          })
        : null);

    const currency = (settings?.default_currency as string) || "USD";
    const logoUrl = await resolveQuoteLogoUrl(
      supabase,
      settings?.quote_logo_storage_path as string | null | undefined
    );
    const logo = await fetchLogoBytes(logoUrl);

    const lineItems = (lines ?? []) as QuoteLineItem[];
    const subtotal =
      Number(doc.subtotal) ||
      lineItems.reduce((s, l) => s + Number(l.line_total || 0), 0);
    const taxRate = Number(doc.tax_rate) || 0;
    const taxAmount = Number(doc.tax_amount) || 0;
    const totalAmount =
      Number(doc.total_amount) || subtotal + taxAmount;

    const buffer = await generateQuotePdf({
      title: doc.title,
      quoteReference,
      dateLocale: uiLocale,
      validUntil: doc.valid_until,
      content: doc.content,
      footerHtml: doc.footer_html,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      currency,
      companyDisplayName: settings?.quote_company_name as string | null,
      logoBytes: logo?.bytes ?? null,
      logoMime: logo?.mime ?? null,
      contact,
      labels: getQuotePdfLabels(uiLocale),
    });

    return { buffer, fileName: pdfFileName(doc.title) };
  }

  const { resolveDocumentContent } = await import("@/lib/documents/load-context");
  const bodyText = await resolveDocumentContent(supabase, doc);
  const buffer = await generateTextPdf({
    title: doc.title,
    body: bodyText || "(No content)",
  });
  return { buffer, fileName: pdfFileName(doc.title) };
}

type QuotePdfContact = {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
} | null;
