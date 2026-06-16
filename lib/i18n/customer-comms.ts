export type CustomerLocale = "en" | "es";

type PaymentReceiptCopy = {
  subject: string;
  bodyOpening: string;
  invoiceRef: string;
  thankYou: string;
};

type CustomerCommsCopy = {
  paymentReceipt: PaymentReceiptCopy;
};

const COPY: Record<CustomerLocale, CustomerCommsCopy> = {
  es: {
    paymentReceipt: {
      subject: "Confirmación de pago — {{invoice_number}}",
      bodyOpening: "Hola {{name}}, hemos recibido tu pago de {{amount}} {{currency}}.",
      invoiceRef: "Factura: {{invoice_number}}",
      thankYou: "Gracias por tu confianza en ClickIn 360.",
    },
  },
  en: {
    paymentReceipt: {
      subject: "Payment confirmation — {{invoice_number}}",
      bodyOpening: "Hi {{name}}, we received your payment of {{amount}} {{currency}}.",
      invoiceRef: "Invoice: {{invoice_number}}",
      thankYou: "Thank you for choosing ClickIn 360.",
    },
  },
};

export function getCustomerT(locale?: string | null): CustomerCommsCopy {
  return locale === "en" ? COPY.en : COPY.es;
}

export function interpolateCustomerCopy(
  template: string,
  values: Record<string, string | number | null | undefined>
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    values[key] == null ? "" : String(values[key])
  );
}
