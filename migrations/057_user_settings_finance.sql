-- Finance settings on workspace owner user_settings row

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS finance_default_tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_number_prefix TEXT NOT NULL DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS invoice_number_start INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invoice_default_due_days INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS invoice_default_footer_text TEXT,
  ADD COLUMN IF NOT EXISTS stripe_configured_at TIMESTAMPTZ;

COMMENT ON COLUMN user_settings.finance_default_tax_rate IS 'Default tax rate for new invoices';
COMMENT ON COLUMN user_settings.invoice_number_prefix IS 'Prefix for auto-generated invoice numbers';
COMMENT ON COLUMN user_settings.invoice_number_start IS 'Starting sequence number for invoices (first year)';
COMMENT ON COLUMN user_settings.invoice_default_due_days IS 'Default due days (e.g. Net 30)';
COMMENT ON COLUMN user_settings.invoice_default_footer_text IS 'Default footer on invoices';
COMMENT ON COLUMN user_settings.stripe_configured_at IS 'When Stripe was first configured (metadata only)';

-- default_currency already constrained to USD/MXN in 014_user_settings.sql
