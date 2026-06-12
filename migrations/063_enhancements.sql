-- Quote currency, finance notification prefs, RLS hardening, finance indexes.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('USD', 'MXN'));

UPDATE documents d
SET currency = COALESCE(
  (SELECT us.default_currency FROM user_settings us WHERE us.user_id = d.user_id),
  'USD'
)
WHERE d.currency IS NULL
  AND d.type IN ('estimate', 'proposal', 'contract');

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS finance_notifications BOOLEAN DEFAULT true;

COMMENT ON COLUMN notification_preferences.finance_notifications IS
  'In-app alerts for invoice payments and overdue invoices.';

-- Deny anon/authenticated direct access to internal support CID sessions.
ALTER TABLE support_cid_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_cid_sessions_deny_anon ON support_cid_sessions;
CREATE POLICY support_cid_sessions_deny_anon ON support_cid_sessions
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS support_cid_sessions_deny_authenticated ON support_cid_sessions;
CREATE POLICY support_cid_sessions_deny_authenticated ON support_cid_sessions
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Deny anon/authenticated access to migration backfill log.
ALTER TABLE _migration_058_backfill_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS migration_058_log_deny_anon ON _migration_058_backfill_log;
CREATE POLICY migration_058_log_deny_anon ON _migration_058_backfill_log
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS migration_058_log_deny_authenticated ON _migration_058_backfill_log;
CREATE POLICY migration_058_log_deny_authenticated ON _migration_058_backfill_log
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Finance query performance indexes.
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_invoice_id ON finance_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_invoice_id ON payment_links(invoice_id);
