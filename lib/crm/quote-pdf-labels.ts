import type { QuotePdfLabels } from "@/lib/documents/quote-pdf";
import en from "@/lib/crm/locales/en.json";
import es from "@/lib/crm/locales/es.json";
import { resolveCrmLocale } from "@/lib/crm/i18n";

type QuotesDict = typeof en.quotes;

function fromQuotesDict(q: QuotesDict): QuotePdfLabels {
  return {
    estimate: q.estimate,
    billTo: q.billTo,
    total: q.total,
    item: q.item,
    qty: q.qty,
    unit: q.unit,
    lineTotal: q.lineTotal,
    subtotal: q.subtotal,
    tax: q.tax,
    notes: q.notes,
    noLineItems: q.noLineItems,
    validUntil: q.validUntil,
    ref: q.ref,
  };
}

export function getQuotePdfLabels(uiLocale?: string | null): QuotePdfLabels {
  const locale = resolveCrmLocale(uiLocale);
  const q = locale === "es" ? es.quotes : en.quotes;
  return fromQuotesDict(q);
}

export function getDefaultQuoteTitle(
  uiLocale: string | null | undefined,
  reference: string
): string {
  const locale = resolveCrmLocale(uiLocale);
  if (locale === "es") {
    return `Cotización ${reference}`;
  }
  return `Quote ${reference}`;
}

export function getQuoteEmailDefaults(
  uiLocale?: string | null,
  acceptUrl?: string | null
): {
  subjectPrefix: string;
  body: string;
} {
  const locale = resolveCrmLocale(uiLocale);
  if (locale === "es") {
    return {
      subjectPrefix: "Cotización",
      body: [
        "Hola,",
        "",
        acceptUrl
          ? `Revise y acepte su cotización en línea:\n${acceptUrl}`
          : "Revise su cotización en línea.",
        "",
        "El PDF adjunto es solo para sus registros.",
        "",
        "Si tiene alguna pregunta, responda a este correo.",
        "",
        "Gracias,",
      ].join("\n"),
    };
  }
  return {
    subjectPrefix: "Quote",
    body: [
      "Hello,",
      "",
      acceptUrl
        ? `Please review and accept your quote online:\n${acceptUrl}`
        : "Please review your quote online.",
      "",
      "The attached PDF is for your records only.",
      "",
      "If you have any questions, reply to this email.",
      "",
      "Thank you,",
    ].join("\n"),
  };
}
