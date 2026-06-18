import type { SupabaseClient } from "@supabase/supabase-js";
import { getClickIn360OrgUserIdOptional } from "@/lib/org/constants";

const CID_FORMAT = /^CID-\d{4}-\d{5}$/;

export function isValidCustomerIdFormat(value: string): boolean {
  return CID_FORMAT.test(value.trim().toUpperCase());
}

export function normalizeCustomerId(value: string): string {
  return value.trim().toUpperCase();
}

/** Sequential CID per workspace: CID-YYYY-00001 */
export async function allocateCustomerId(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CID-${year}-`;

  const { data } = await supabase
    .from("contacts")
    .select("customer_id")
    .eq("user_id", workspaceOwnerId)
    .not("customer_id", "is", null)
    .like("customer_id", `${prefix}%`);

  let maxSeq = 0;
  for (const row of data ?? []) {
    const cid = (row.customer_id as string)?.trim();
    if (!cid?.startsWith(prefix)) continue;
    const seq = Number.parseInt(cid.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }

  const next = String(maxSeq + 1).padStart(5, "0");
  return `${prefix}${next}`;
}

export async function findContactByCustomerId(
  supabase: SupabaseClient,
  customerId: string
): Promise<{ id: string; user_id: string; email: string | null; first_name: string; last_name: string } | null> {
  const normalized = normalizeCustomerId(customerId);
  if (!isValidCustomerIdFormat(normalized)) return null;

  const orgOwnerId = getClickIn360OrgUserIdOptional();
  let dbQuery = supabase
    .from("contacts")
    .select("id, user_id, email, first_name, last_name, customer_id")
    .eq("customer_id", normalized);

  if (orgOwnerId) {
    dbQuery = dbQuery.eq("user_id", orgOwnerId);
  }

  const { data } = await dbQuery.maybeSingle();
  if (!data) return null;

  return {
    id: data.id as string,
    user_id: data.user_id as string,
    email: (data.email as string | null) ?? null,
    first_name: data.first_name as string,
    last_name: data.last_name as string,
  };
}
