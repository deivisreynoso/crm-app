-- Invoice wizard: types, collection method, pending status

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'pending', 'sent', 'viewed', 'paid', 'overdue', 'voided'));

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'services'
    CHECK (invoice_type IN ('quote', 'services', 'retainer', 'deposit', 'change_order', 'milestone'));

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS collection_method TEXT
    CHECK (collection_method IS NULL OR collection_method IN ('manual', 'payment_link'));

CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(user_id, invoice_type);
