-- Partial payments: explicit invoice status while balance remains open

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN (
    'draft',
    'pending',
    'partially_paid',
    'sent',
    'viewed',
    'paid',
    'overdue',
    'voided'
  ));
