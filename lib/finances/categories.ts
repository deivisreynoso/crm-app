import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureFinanceCategories(
  supabase: SupabaseClient,
  workspaceOwnerId: string
) {
  const { error } = await supabase.rpc("seed_finance_categories_for_workspace", {
    ws_user_id: workspaceOwnerId,
  });
  if (error) {
    // Fallback if RPC not deployed yet
    const defaults = [
      { kind: "income", slug: "quote_payment", label: "Quote Payment", sort_order: 10 },
      { kind: "income", slug: "retainer", label: "Retainer", sort_order: 20 },
      { kind: "income", slug: "other_income", label: "Other Income", sort_order: 30 },
      { kind: "expense", slug: "payroll", label: "Payroll", sort_order: 10 },
      { kind: "expense", slug: "software", label: "Software & Tools", sort_order: 20 },
      { kind: "expense", slug: "marketing", label: "Marketing", sort_order: 30 },
      { kind: "expense", slug: "office", label: "Office & Facilities", sort_order: 40 },
      { kind: "expense", slug: "contractor", label: "Contractors", sort_order: 50 },
      { kind: "expense", slug: "other_expense", label: "Other Expense", sort_order: 60 },
    ];
    for (const row of defaults) {
      await supabase.from("finance_categories").upsert(
        {
          user_id: workspaceOwnerId,
          kind: row.kind,
          slug: row.slug,
          label: row.label,
          is_system: true,
          sort_order: row.sort_order,
        },
        { onConflict: "user_id,kind,slug", ignoreDuplicates: true }
      );
    }
  }
}

export async function getCategoryBySlug(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  kind: "income" | "expense",
  slug: string
) {
  await ensureFinanceCategories(supabase, workspaceOwnerId);
  const { data } = await supabase
    .from("finance_categories")
    .select("id, slug, label, kind, is_system")
    .eq("user_id", workspaceOwnerId)
    .eq("kind", kind)
    .eq("slug", slug)
    .maybeSingle();
  return data;
}
