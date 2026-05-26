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

const REF_PATTERN = /^Q-(\d{4})-(\d+)$/;

function quoteRefPrefix(year: number): string {
  return `Q-${year}-`;
}

function formatQuoteRef(year: number, sequence: number): string {
  return `${quoteRefPrefix(year)}${String(sequence).padStart(5, "0")}`;
}

function maxSequenceForYear(
  rows: { quote_reference: string | null }[] | null | undefined,
  year: number
): number {
  let maxSeq = 0;
  for (const row of rows ?? []) {
    const ref = row.quote_reference?.trim();
    if (!ref) continue;
    const match = ref.match(REF_PATTERN);
    if (!match) continue;
    const refYear = Number(match[1]);
    const seq = Number(match[2]);
    if (refYear === year && Number.isFinite(seq)) {
      maxSeq = Math.max(maxSeq, seq);
    }
  }
  return maxSeq;
}

/** Next sequential quote reference for a workspace (e.g. Q-2026-00042). */
export async function allocateQuoteReference(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = quoteRefPrefix(year);

  const { data: rows, error } = await supabase
    .from("documents")
    .select("quote_reference")
    .eq("user_id", workspaceOwnerId)
    .in("type", [...QUOTE_DOCUMENT_TYPES])
    .not("quote_reference", "is", null);

  if (error) {
    console.error("allocateQuoteReference:", error.message);
    const fallback = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    return `${prefix}${fallback}`;
  }

  const next = maxSequenceForYear(rows, year) + 1;
  return formatQuoteRef(year, next);
}

export function isGenericQuoteTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  return !t || GENERIC_TITLES.has(t);
}

export function isQuoteReferenceConflict(message: string): boolean {
  return message.includes("idx_documents_user_quote_reference");
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

  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = await allocateQuoteReference(supabase, doc.user_id);
    const { error } = await supabase
      .from("documents")
      .update({ quote_reference: ref, updated_at: new Date().toISOString() })
      .eq("id", doc.id)
      .is("quote_reference", null);

    if (!error) return ref;

    if (isQuoteReferenceConflict(error.message) && attempt < 4) continue;

    console.error("ensureQuoteReference:", error.message);
    return ref;
  }

  return null;
}
