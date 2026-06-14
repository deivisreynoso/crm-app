-- Sprint 5: recurring invoices (lazy generation, mirrors finance_transactions recurrence).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS recurrence_rule JSONB,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_recurring_parent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_invoices_recurring_parent
  ON invoices (user_id, is_recurring_parent)
  WHERE is_recurring_parent = true;

COMMENT ON COLUMN invoices.recurrence_rule IS 'Recurrence schedule: frequency, interval, next_date, end_date';
COMMENT ON COLUMN invoices.recurrence_parent_id IS 'Parent invoice for generated recurring occurrences';
COMMENT ON COLUMN invoices.is_recurring_parent IS 'True when this invoice is the recurrence template';
