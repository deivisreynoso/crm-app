import type { SupabaseClient } from "@supabase/supabase-js";

type RecurrenceRule = {
  frequency: "weekly" | "monthly" | "annually";
  interval: number;
  next_date: string;
  end_date?: string | null;
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

/** Generate overdue recurring invoice occurrences on-demand (mirrors expense recurrence). */
export async function processDueRecurringInvoices(
  supabase: SupabaseClient,
  workspaceOwnerId: string
) {
  const today = formatDate(new Date());
  const { data: parents } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", workspaceOwnerId)
    .eq("is_recurring_parent", true)
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
        .from("invoices")
        .select("id")
        .eq("user_id", workspaceOwnerId)
        .eq("recurrence_parent_id", parent.id)
        .eq("issue_date", nextDate)
        .maybeSingle();

      if (!existing) {
        const invoiceNumber = `${parent.invoice_number as string}-${nextDate}`;
        await supabase.from("invoices").insert({
          user_id: workspaceOwnerId,
          contact_id: parent.contact_id,
          quote_id: parent.quote_id,
          invoice_number: invoiceNumber,
          status: "draft",
          currency: parent.currency,
          subtotal: parent.subtotal,
          tax_rate: parent.tax_rate,
          tax_amount: parent.tax_amount,
          total: parent.total,
          line_items: parent.line_items,
          notes: parent.notes,
          footer_text: parent.footer_text,
          issue_date: nextDate,
          due_date: nextDate,
          recurrence_parent_id: parent.id,
        });
      }

      const advanced = addInterval(new Date(`${nextDate}T12:00:00Z`), rule.frequency, interval);
      nextDate = formatDate(advanced);
    }

    await supabase
      .from("invoices")
      .update({
        recurrence_rule: { ...rule, next_date: nextDate },
        updated_at: new Date().toISOString(),
      })
      .eq("id", parent.id);
  }
}
