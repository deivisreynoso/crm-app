import { PDFDocument, StandardFonts, type PDFFont, rgb } from "pdf-lib";

const MARGIN = 50;
const TITLE_SIZE = 18;
const BODY_SIZE = 11;
const LINE_GAP = 4;

/** Strip HTML for plain-text PDF output (line items, footers, etc.). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[dh][^>]*>/gi, "\t")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\t+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width <= maxWidth) {
        line = candidate;
      } else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }

  return out.length > 0 ? out : [""];
}

export async function generateTextPdf(options: {
  title: string;
  body: string;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const plainBody = htmlToPlainText(options.body);
  let page = pdfDoc.addPage();
  let pageWidth = page.getWidth();
  let pageHeight = page.getHeight();
  let y = pageHeight - MARGIN;
  const contentWidth = pageWidth - MARGIN * 2;

  const ensureSpace = (needed: number) => {
    if (y - needed >= MARGIN) return;
    page = pdfDoc.addPage();
    pageWidth = page.getWidth();
    pageHeight = page.getHeight();
    y = pageHeight - MARGIN;
  };

  const drawLines = (lines: string[], fontSize: number, bold = false) => {
    const activeFont = bold ? fontBold : font;
    for (const line of lines) {
      ensureSpace(fontSize + LINE_GAP);
      page.drawText(line, {
        x: MARGIN,
        y: y - fontSize,
        size: fontSize,
        font: activeFont,
        color: rgb(0, 0, 0),
        maxWidth: contentWidth,
      });
      y -= fontSize + LINE_GAP;
    }
  };

  drawLines(wrapText(options.title, fontBold, TITLE_SIZE, contentWidth), TITLE_SIZE, true);
  y -= 6;
  drawLines(wrapText(plainBody, font, BODY_SIZE, contentWidth), BODY_SIZE);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
