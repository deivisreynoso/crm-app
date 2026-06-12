import type { SupabaseClient } from "@supabase/supabase-js";
import { generateQuotePdf } from "@/lib/documents/quote-pdf";
import { getQuotePdfLabels } from "@/lib/crm/quote-pdf-labels";
import { resolveQuoteLogoUrl } from "@/lib/storage/quote-logo";
import { uploadToDocumentsBucket } from "@/lib/storage/documents";
import type { QuoteLineItem } from "@/types";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export function isQuoteAcceptedForBilling(quote: {
  status?: string;
  accepted_at?: string | null;
}): boolean {
  return (
    quote.status === "accepted" ||
    quote.status === "signed" ||
    !!quote.accepted_at
  );
}

export async function assertQuoteAcceptedForInvoice(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  quoteId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: quote } = await supabase
    .from("documents")
    .select("id, status, accepted_at")
    .eq("id", quoteId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!quote) {
    return { ok: false, reason: "Quote not found." };
  }

  const accepted =
    quote.status === "accepted" ||
    quote.status === "signed" ||
    !!quote.accepted_at;

  if (!accepted) {
    return { ok: false, reason: "Quote must be accepted before creating an invoice." };
  }

  return { ok: true };
}

export async function assertNoActiveInvoiceForQuote(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  quoteId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("user_id", workspaceOwnerId)
    .eq("quote_id", quoteId)
    .neq("status", "voided")
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      reason: `An active invoice already exists for this quote (${existing.invoice_number}).`,
    };
  }

  return { ok: true };
}

export async function duplicateInvoice(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string
) {
  const { data: source, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (error || !source) {
    throw new Error("Invoice not found");
  }

  const { data: created, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: workspaceOwnerId,
      quote_id: null,
      contact_id: source.contact_id,
      line_items: source.line_items,
      subtotal: source.subtotal,
      tax_rate: source.tax_rate,
      tax_amount: source.tax_amount,
      discount_amount: source.discount_amount,
      total: source.total,
      currency: source.currency,
      due_date: source.due_date,
      notes: source.notes,
      footer_text: source.footer_text,
      invoice_number: "",
      status: "draft",
    })
    .select(
      `
      *,
      contact:contacts(id, first_name, last_name, email),
      quote:documents(id, title, quote_reference)
    `
    )
    .single();

  if (insertError) throw insertError;
  return created;
}

export type NewlyOverdueInvoice = { id: string; invoice_number: string };

export async function markOverdueInvoices(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<NewlyOverdueInvoice[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("invoices")
    .update({ status: "overdue", updated_at: new Date().toISOString() })
    .eq("user_id", workspaceOwnerId)
    .in("status", ["sent", "viewed", "pending", "partially_paid"])
    .lt("due_date", today)
    .select("id, invoice_number");

  return (data ?? []) as NewlyOverdueInvoice[];
}

function mapInvoiceLines(lineItems: InvoiceLineItem[]): QuoteLineItem[] {
  return lineItems.map((line, i) => ({
    id: `inv-${i}`,
    document_id: "",
    user_id: "",
    description: line.description,
    quantity: Number(line.quantity) || 1,
    unit_price: Number(line.unit_price) || 0,
    line_total: Number(line.line_total) || 0,
    sort_order: i,
    created_at: new Date().toISOString(),
  }));
}

export async function generateInvoicePdfBuffer(
  supabase: SupabaseClient,
  invoice: {
    id: string;
    invoice_number: string;
    line_items: InvoiceLineItem[];
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    currency: string;
    due_date?: string | null;
    notes?: string | null;
    footer_text?: string | null;
    contact_id: string;
  },
  workspaceOwnerId: string
): Promise<{ buffer: Buffer; fileName: string; storagePath: string }> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("first_name, last_name, email, company")
    .eq("id", invoice.contact_id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("user_settings")
    .select(
      "quote_company_name, quote_logo_storage_path, quote_primary_color, quote_font_family, ui_locale"
    )
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  const logoUrl = await resolveQuoteLogoUrl(
    supabase,
    settings?.quote_logo_storage_path as string | null | undefined
  );

  let logoBytes: { bytes: Uint8Array; mime: "png" | "jpg" } | null = null;
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const type = (res.headers.get("content-type") || "").toLowerCase();
        if (type.includes("png")) logoBytes = { bytes: buf, mime: "png" };
        else logoBytes = { bytes: buf, mime: "jpg" };
      }
    } catch {
      /* ignore */
    }
  }

  const labels = getQuotePdfLabels((settings?.ui_locale as string) || "en");
  const buffer = await generateQuotePdf({
    title: `Invoice ${invoice.invoice_number}`,
    quoteReference: invoice.invoice_number,
    validUntil: invoice.due_date ?? undefined,
    content: invoice.notes ?? undefined,
    footerHtml: invoice.footer_text ?? undefined,
    lineItems: mapInvoiceLines(
      Array.isArray(invoice.line_items) ? invoice.line_items : []
    ),
    subtotal: Number(invoice.subtotal) || 0,
    taxRate: Number(invoice.tax_rate) || 0,
    taxAmount: Number(invoice.tax_amount) || 0,
    totalAmount: Number(invoice.total) || 0,
    currency: invoice.currency || "USD",
    companyDisplayName: (settings?.quote_company_name as string) || undefined,
    logoBytes: logoBytes?.bytes ?? null,
    logoMime: logoBytes?.mime ?? null,
    contact: contact
      ? {
          first_name: contact.first_name ?? "",
          last_name: contact.last_name ?? "",
          email: contact.email,
        }
      : null,
    labels: { ...labels, estimate: "INVOICE" },
  });

  const fileName = `${invoice.invoice_number.replace(/[^\w.-]+/g, "_")}.pdf`;
  const storagePath = `${workspaceOwnerId}/invoices/${invoice.id}/${fileName}`;

  return { buffer, fileName, storagePath };
}

export async function storeInvoicePdf(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string,
  pdf: { buffer: Buffer; fileName: string; storagePath: string }
) {
  const file = new File([new Uint8Array(pdf.buffer)], pdf.fileName, {
    type: "application/pdf",
  });
  const uploaded = await uploadToDocumentsBucket(
    supabase,
    workspaceOwnerId,
    `invoices/${invoiceId}`,
    file
  );

  await supabase
    .from("invoices")
    .update({
      pdf_storage_path: uploaded.storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  return uploaded;
}
