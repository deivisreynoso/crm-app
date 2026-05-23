import PDFDocument from "pdfkit";

export async function generateTextPdf(options: {
  title: string;
  body: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(options.title, { align: "left" });
    doc.moveDown();
    doc.fontSize(11).text(options.body, { align: "left" });
    doc.end();
  });
}
