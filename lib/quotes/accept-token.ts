import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppOrigin } from "@/lib/auth/app-url";
import { isQuoteDocument } from "@/lib/documents/kinds";

export function generateAcceptToken(): string {
  const a = crypto.randomUUID().replace(/-/g, "");
  const b = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${a}${b}`;
}

export function quoteAcceptPublicUrl(token: string): string {
  return `${getAppOrigin()}/quote/${token}`;
}

/** Assign a public accept token when missing (quotes only). */
export async function ensureAcceptToken(
  supabase: SupabaseClient,
  doc: { id: string; type: string; accept_token?: string | null }
): Promise<string | null> {
  if (!isQuoteDocument(doc.type)) return null;
  if (doc.accept_token?.trim()) return doc.accept_token.trim();

  const token = generateAcceptToken();
  const { error } = await supabase
    .from("documents")
    .update({ accept_token: token, updated_at: new Date().toISOString() })
    .eq("id", doc.id)
    .is("accept_token", null);

  if (error) {
    console.error("ensureAcceptToken:", error.message);
    return token;
  }
  return token;
}
