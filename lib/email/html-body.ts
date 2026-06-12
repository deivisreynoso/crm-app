import { htmlToPlainText } from "@/lib/documents/pdf";

export function isHtmlEmailBody(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

export { htmlToPlainText };

/** Plain-text preview for timeline summaries and clipboard copy. */
export function emailBodyPlainText(body: string): string {
  if (!body.trim()) return "";
  return isHtmlEmailBody(body) ? htmlToPlainText(body) : body;
}

/** Strip dangerous markup before rendering CRM email HTML in the UI. */
export function sanitizeEmailHtmlForDisplay(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\shref\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, ' href="#"');
}

export function formatFromHeader(email: string, displayName?: string | null): string {
  const addr = email.trim();
  if (!addr) return "";
  const name = displayName?.trim();
  if (!name) return addr;
  const safeName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${safeName}" <${addr}>`;
}

export function generateMessageId(fromEmail: string): string {
  const domain = fromEmail.split("@")[1]?.trim() || "clickin360.com";
  const token = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;
  return `<${token}@${domain}>`;
}
