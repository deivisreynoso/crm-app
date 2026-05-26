import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import type { QuoteLineItem } from "@/types";
import { formatQuoteDate } from "@/lib/crm/format-date";
import { formatCurrency } from "@/lib/utils";
import { htmlToPlainText } from "@/lib/documents/pdf";

export type QuotePdfLabels = {
  estimate: string;
  billTo: string;
  total: string;
  item: string;
  qty: string;
  unit: string;
  lineTotal: string;
  subtotal: string;
  tax: string;
  notes: string;
  noLineItems: string;
  validUntil: string;
  ref: string;
};

export const DEFAULT_QUOTE_PDF_LABELS: QuotePdfLabels = {
  estimate: "ESTIMATE",
  billTo: "Bill to",
  total: "Total",
  item: "Item",
  qty: "Qty",
  unit: "Unit",
  lineTotal: "Total",
  subtotal: "Subtotal",
  tax: "Tax",
  notes: "Notes",
  noLineItems: "No line items yet.",
  validUntil: "Valid until",
  ref: "Ref",
};

export type QuotePdfInput = {
  title: string;
  quoteReference?: string | null;
  dateLocale?: string | null;
  validUntil?: string | null;
  content?: string | null;
  footerHtml?: string | null;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  companyDisplayName?: string | null;
  logoBytes?: Uint8Array | null;
  logoMime?: "png" | "jpg" | null;
  contact?: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  labels?: Partial<QuotePdfLabels>;
};

const PAGE_W = 612;
const PAGE_H = 792;
const M = 50;
const SLATE_500 = rgb(0.39, 0.45, 0.52);
const SLATE_700 = rgb(0.23, 0.27, 0.31);
const SLATE_900 = rgb(0.07, 0.09, 0.15);
const LINE_COLOR = rgb(0.88, 0.91, 0.94);

const COL_DESC = M;
const COL_QTY = 360;
const COL_UNIT = 420;
const COL_TOTAL = PAGE_W - M;

type Fonts = { regular: PDFFont; bold: PDFFont };

function drawRight(
  page: PDFPage,
  text: string,
  xRight: number,
  y: number,
  font: PDFFont,
  size: number,
  color = SLATE_900
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xRight - w, y, size, font, color });
}

function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

async function embedLogo(
  pdfDoc: PDFDocument,
  bytes: Uint8Array,
  mime: "png" | "jpg"
) {
  try {
    return mime === "png"
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function generateQuotePdf(input: QuotePdfInput): Promise<Buffer> {
  const labels = { ...DEFAULT_QUOTE_PDF_LABELS, ...input.labels };
  const pdfDoc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const ref = input.quoteReference?.trim() || "—";
  const brandName = input.companyDisplayName?.trim() || "—";

  let logoBottom = y;
  if (input.logoBytes && input.logoMime) {
    const logo = await embedLogo(pdfDoc, input.logoBytes, input.logoMime);
    if (logo) {
      const maxW = 200;
      const maxH = 60;
      const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
      const w = logo.width * scale;
      const h = logo.height * scale;
      page.drawImage(logo, {
        x: M,
        y: y - h,
        width: w,
        height: h,
      });
      logoBottom = y - h - 8;
    }
  }

  if (!input.logoBytes) {
    page.drawText(brandName, {
      x: M,
      y: y - 16,
      size: 14,
      font: fonts.bold,
      color: SLATE_900,
    });
    logoBottom = y - 28;
  }

  const headerRightX = PAGE_W - M;
  let hy = y - 10;
  drawRight(page, labels.estimate, headerRightX, hy, fonts.bold, 9, SLATE_500);
  hy -= 14;
  drawRight(page, input.title, headerRightX, hy, fonts.bold, 11, SLATE_900);
  hy -= 13;
  drawRight(
    page,
    `${labels.ref}: ${ref}`,
    headerRightX,
    hy,
    fonts.regular,
    9,
    SLATE_500
  );
  if (input.validUntil) {
    hy -= 12;
    drawRight(
      page,
      `${labels.validUntil}: ${formatQuoteDate(input.validUntil, input.dateLocale)}`,
      headerRightX,
      hy,
      fonts.regular,
      9,
      SLATE_500
    );
  }

  y = Math.min(logoBottom, hy) - 24;

  page.drawText(labels.billTo.toUpperCase(), {
    x: M,
    y,
    size: 8,
    font: fonts.bold,
    color: SLATE_500,
  });
  const contactName = input.contact
    ? `${input.contact.first_name} ${input.contact.last_name}`.trim()
    : "—";
  page.drawText(contactName, {
    x: M,
    y: y - 14,
    size: 11,
    font: fonts.bold,
    color: SLATE_900,
  });
  let billY = y - 26;
  if (input.contact?.email) {
    page.drawText(input.contact.email, {
      x: M,
      y: billY,
      size: 9,
      font: fonts.regular,
      color: SLATE_700,
    });
    billY -= 12;
  }
  if (input.contact?.phone) {
    page.drawText(input.contact.phone, {
      x: M,
      y: billY,
      size: 9,
      font: fonts.regular,
      color: SLATE_700,
    });
  }

  drawRight(page, labels.total.toUpperCase(), headerRightX, y, fonts.bold, 8, SLATE_500);
  drawRight(
    page,
    formatCurrency(input.totalAmount, input.currency),
    headerRightX,
    y - 22,
    fonts.bold,
    20,
    SLATE_900
  );

  y = Math.min(billY, y - 44) - 16;

  page.drawLine({
    start: { x: M, y },
    end: { x: PAGE_W - M, y },
    thickness: 1,
    color: LINE_COLOR,
  });
  y -= 18;

  page.drawText(labels.item, {
    x: COL_DESC,
    y,
    size: 9,
    font: fonts.bold,
    color: SLATE_500,
  });
  drawRight(page, labels.qty, COL_QTY + 40, y, fonts.bold, 9, SLATE_500);
  drawRight(page, labels.unit, COL_UNIT + 55, y, fonts.bold, 9, SLATE_500);
  drawRight(page, labels.lineTotal, COL_TOTAL, y, fonts.bold, 9, SLATE_500);
  y -= 6;
  page.drawLine({
    start: { x: M, y },
    end: { x: PAGE_W - M, y },
    thickness: 1,
    color: LINE_COLOR,
  });
  y -= 16;

  const lines = input.lineItems;
  if (lines.length === 0) {
    page.drawText(labels.noLineItems, {
      x: M,
      y: y - 12,
      size: 10,
      font: fonts.regular,
      color: SLATE_500,
    });
    y -= 36;
  } else {
    for (const line of lines) {
      if (y < M + 120) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - M;
      }
      const descLines = wrapLines(
        line.description,
        fonts.regular,
        10,
        COL_QTY - COL_DESC - 12
      );
      const rowH = Math.max(descLines.length * 13, 18);
      let dy = y - 10;
      for (const dl of descLines) {
        page.drawText(dl, {
          x: COL_DESC,
          y: dy,
          size: 10,
          font: fonts.regular,
          color: SLATE_900,
        });
        dy -= 13;
      }
      const midY = y - rowH / 2 - 4;
      drawRight(
        page,
        String(Number(line.quantity)),
        COL_QTY + 40,
        midY,
        fonts.regular,
        10,
        SLATE_700
      );
      drawRight(
        page,
        formatCurrency(Number(line.unit_price) || 0, input.currency),
        COL_UNIT + 55,
        midY,
        fonts.regular,
        10,
        SLATE_700
      );
      drawRight(
        page,
        formatCurrency(Number(line.line_total) || 0, input.currency),
        COL_TOTAL,
        midY,
        fonts.regular,
        10,
        SLATE_900
      );
      y -= rowH + 6;
      page.drawLine({
        start: { x: M, y: y + 4 },
        end: { x: PAGE_W - M, y: y + 4 },
        thickness: 0.5,
        color: LINE_COLOR,
      });
    }
  }

  y -= 12;
  const totalsX = PAGE_W - M - 200;
  const totalsValX = COL_TOTAL;

  const row = (label: string, value: string, bold = false) => {
    if (y < M + 40) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
    }
    const font = bold ? fonts.bold : fonts.regular;
    const size = bold ? 11 : 10;
    page.drawText(label, { x: totalsX, y, size, font, color: SLATE_700 });
    drawRight(page, value, totalsValX, y, font, size, SLATE_900);
    y -= bold ? 18 : 15;
  };

  row(labels.subtotal, formatCurrency(input.subtotal, input.currency));
  if (input.taxRate > 0) {
    row(
      `${labels.tax} (${input.taxRate}%)`,
      formatCurrency(input.taxAmount, input.currency)
    );
  }
  y -= 4;
  page.drawLine({
    start: { x: totalsX, y: y + 10 },
    end: { x: PAGE_W - M, y: y + 10 },
    thickness: 1,
    color: LINE_COLOR,
  });
  row(labels.total, formatCurrency(input.totalAmount, input.currency), true);

  const notes = input.content?.trim();
  if (notes) {
    y -= 16;
    if (y < M + 80) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
    }
    page.drawText(labels.notes.toUpperCase(), {
      x: M,
      y,
      size: 8,
      font: fonts.bold,
      color: SLATE_500,
    });
    y -= 14;
    for (const line of wrapLines(notes, fonts.regular, 10, PAGE_W - M * 2)) {
      if (y < M + 20) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - M;
      }
      page.drawText(line, {
        x: M,
        y,
        size: 10,
        font: fonts.regular,
        color: SLATE_700,
      });
      y -= 13;
    }
  }

  const footer = input.footerHtml?.trim();
  if (footer) {
    y -= 10;
    const footerText = htmlToPlainText(footer);
    for (const line of wrapLines(footerText, fonts.regular, 9, PAGE_W - M * 2)) {
      if (y < M + 20) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - M;
      }
      page.drawText(line, {
        x: M,
        y,
        size: 9,
        font: fonts.regular,
        color: SLATE_500,
      });
      y -= 12;
    }
  }

  return Buffer.from(await pdfDoc.save());
}
