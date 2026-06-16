export const QUOTE_SEND_CATEGORY = "quote_send";

export type QuoteSendTemplateContent = {
  name: string;
  subject: string;
  body: string;
  locale: "en" | "es";
};

const EN_TEMPLATE: QuoteSendTemplateContent = {
  locale: "en",
  name: "Quote send (English)",
  subject: "Your quote {{quote_number}} from ClickIn 360",
  body: [
    "Hello {{contact_name}},",
    "",
    "Please find attached your quote {{quote_number}} for a total of {{quote_total}}.",
    "",
    "To review and accept it, click the link below:",
    "{{acceptance_link}}",
    "",
    "If you have any questions, please don't hesitate to reach out.",
    "",
    "{{sender_name}}",
    "ClickIn 360",
  ].join("\n"),
};

const ES_TEMPLATE: QuoteSendTemplateContent = {
  locale: "es",
  name: "Envío de cotización (Español)",
  subject: "Tu cotización {{quote_number}} de ClickIn 360",
  body: [
    "Hola {{contact_name}},",
    "",
    "Adjunto encontrarás tu cotización {{quote_number}} por un total de {{quote_total}}.",
    "",
    "Para revisarla y aceptarla, haz clic en el siguiente enlace:",
    "{{acceptance_link}}",
    "",
    "Si tienes alguna pregunta, no dudes en contactarnos.",
    "",
    "{{sender_name}}",
    "ClickIn 360",
  ].join("\n"),
};

export function quoteSendTemplateContent(locale: "en" | "es"): QuoteSendTemplateContent {
  return locale === "es" ? ES_TEMPLATE : EN_TEMPLATE;
}

export const QUOTE_SEND_TEMPLATE_VARIABLES = [
  "contact_name",
  "quote_number",
  "quote_total",
  "acceptance_link",
  "sender_name",
];
