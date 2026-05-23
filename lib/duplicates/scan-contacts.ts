import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalEmail, canonicalPhone } from "@/lib/identity/normalize";

type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
};

function pairKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function scanContactDuplicates(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const rows = (contacts ?? []) as ContactRow[];
  const pairs = new Map<
    string,
    { c1: ContactRow; c2: ContactRow; score: number; reason: string }
  >();

  function addPair(
    c1: ContactRow,
    c2: ContactRow,
    score: number,
    reason: string
  ) {
    if (c1.id === c2.id) return;
    const key = pairKey(c1.id, c2.id);
    const existing = pairs.get(key);
    if (!existing || score > existing.score) {
      pairs.set(key, { c1, c2, score, reason });
    }
  }

  const byEmail = new Map<string, ContactRow[]>();
  const byPhone = new Map<string, ContactRow[]>();

  for (const c of rows) {
    const emailKey = canonicalEmail(c.email);
    if (emailKey) {
      const list = byEmail.get(emailKey) ?? [];
      list.push(c);
      byEmail.set(emailKey, list);
    }

    const phoneKey = canonicalPhone(c.phone);
    if (phoneKey) {
      const list = byPhone.get(phoneKey) ?? [];
      list.push(c);
      byPhone.set(phoneKey, list);
    }
  }

  for (const group of byEmail.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        addPair(group[i], group[j], 1, "same_email");
      }
    }
  }

  for (const group of byPhone.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const email1 = canonicalEmail(group[i].email);
        const email2 = canonicalEmail(group[j].email);
        if (email1 && email2 && email1 !== email2) {
          addPair(group[i], group[j], 0.92, "same_phone");
        } else {
          addPair(group[i], group[j], 0.98, "same_phone");
        }
      }
    }
  }

  const { data: existing } = await supabase
    .from("duplicate_reviews")
    .select("contact1_id, contact2_id, status")
    .eq("user_id", userId);

  const existingKeys = new Set(
    (existing ?? [])
      .filter((r) => r.status !== "dismissed")
      .map((r) => pairKey(r.contact1_id as string, r.contact2_id as string))
  );

  let created = 0;
  for (const { c1, c2, score } of pairs.values()) {
    const key = pairKey(c1.id, c2.id);
    if (existingKeys.has(key)) continue;

    const id1 = c1.id < c2.id ? c1.id : c2.id;
    const id2 = c1.id < c2.id ? c2.id : c1.id;

    const { error: insertError } = await supabase.from("duplicate_reviews").insert({
      user_id: userId,
      contact1_id: id1,
      contact2_id: id2,
      similarity_score: score,
      status: "pending",
    });

    if (!insertError) {
      created++;
      existingKeys.add(key);
    }
  }

  return {
    scanned: rows.length,
    pairsFound: pairs.size,
    created,
    emailGroups: [...byEmail.values()].filter((g) => g.length > 1).length,
    phoneGroups: [...byPhone.values()].filter((g) => g.length > 1).length,
  };
}
