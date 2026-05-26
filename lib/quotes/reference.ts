import type { SupabaseClient } from "@supabase/supabase-js";
import { isQuoteDocument, QUOTE_DOCUMENT_TYPES } from "@/lib/documents/kinds";

const GENERIC_TITLES = new Set(
  [
    "new estimate",
    "new quote",
    "new proposal",
    "new contract",
    "nueva cotización",
    "nueva cotizacion",
    "nuevo presupuesto",
  ].map((s) => s.toLowerCase())
);

/** Next sequential quote reference for a workspace (e.g. Q-2026-00042). */
export async function allocateQuoteReference(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;

  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", workspaceOwnerId)
    .in("type", [...QUOTE_DOCUMENT_TYPES]);

  if (error) {
    console.error("allocateQuoteReference count:", error.message);
    const fallback = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    return `${prefix}${fallback}`;
  }

  const next = (count ?? 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export function isGenericQuoteTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  return !t || GENERIC_TITLES.has(t);
}

/** Ensure existing quotes get a reference (legacy rows). */
export async function ensureQuoteReference(
  supabase: SupabaseClient,
  doc: {
    id: string;
    user_id: string;
    type: string;
    quote_reference?: string | null;
  }
): Promise<string | null> {
  if (!isQuoteDocument(doc.type)) return null;
  if (doc.quote_reference?.trim()) return doc.quote_reference.trim();

  const ref = await allocateQuoteReference(supabase, doc.user_id);
  await supabase
    .from("documents")
    .update({ quote_reference: ref, updated_at: new Date().toISOString() })
    .eq("id", doc.id);

  return ref;
}
