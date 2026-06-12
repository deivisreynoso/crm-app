import type { SupabaseClient } from "@supabase/supabase-js";

type RecurrenceRule = {
  frequency: "weekly" | "monthly" | "annually";
  interval: number;
  next_date: string;
  end_date?: string | null;
  parent_transaction_id?: string | null;
};

function addInterval(date: Date, frequency: RecurrenceRule["frequency"], interval: number): Date {
  const next = new Date(date);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7 * interval);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + interval);
  } else {
    next.setFullYear(next.getFullYear() + interval);
  }
  return next;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Generate any overdue recurring expense occurrences (on-demand). */
export async function processDueRecurringTransactions(
  supabase: SupabaseClient,
  workspaceOwnerId: string
) {
  const today = formatDate(new Date());
  const { data: parents } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("user_id", workspaceOwnerId)
    .eq("is_recurring_parent", true)
    .eq("type", "expense")
    .not("recurrence_rule", "is", null);

  for (const parent of parents ?? []) {
    const rule = parent.recurrence_rule as RecurrenceRule | null;
    if (!rule?.next_date || !rule.frequency) continue;
    if (rule.end_date && rule.end_date < today) continue;

    let nextDate = rule.next_date;
    const interval = Math.max(1, Number(rule.interval) || 1);

    while (nextDate <= today) {
      if (rule.end_date && nextDate > rule.end_date) break;

      const { data: existing } = await supabase
        .from("finance_transactions")
        .select("id")
        .eq("user_id", workspaceOwnerId)
        .eq("recurrence_parent_id", parent.id)
        .eq("transaction_date", nextDate)
        .maybeSingle();

      if (!existing) {
        await supabase.from("finance_transactions").insert({
          user_id: workspaceOwnerId,
          type: "expense",
          category_id: parent.category_id,
          amount: parent.amount,
          currency: parent.currency,
          status: "completed",
          source: "manual",
          direction: "outbound",
          contact_id: parent.contact_id,
          description: parent.description,
          notes: parent.notes,
          vendor_name: parent.vendor_name,
          transaction_date: nextDate,
          recorded_by: parent.recorded_by,
          recurrence_parent_id: parent.id,
          attachments: parent.attachments ?? [],
          tags: parent.tags ?? [],
        });
      }

      const advanced = addInterval(new Date(`${nextDate}T12:00:00Z`), rule.frequency, interval);
      nextDate = formatDate(advanced);
    }

    await supabase
      .from("finance_transactions")
      .update({
        recurrence_rule: { ...rule, next_date: nextDate },
        updated_at: new Date().toISOString(),
      })
      .eq("id", parent.id);
  }
}
