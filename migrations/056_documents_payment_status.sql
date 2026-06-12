-- Quote payment tracking on documents

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_payment_status_check;
ALTER TABLE documents
  ADD CONSTRAINT documents_payment_status_check
  CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid'));

UPDATE documents
SET payment_status = 'unpaid', amount_paid = 0
WHERE payment_status IS NULL OR amount_paid IS NULL;

COMMENT ON COLUMN documents.payment_status IS 'Client payment state for quotes: unpaid, partially_paid, paid';
COMMENT ON COLUMN documents.amount_paid IS 'Sum of completed inbound income transactions for this quote';
