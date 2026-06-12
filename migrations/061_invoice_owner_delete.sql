-- Allow workspace owners to permanently purge test invoices (bypasses no-delete triggers).

CREATE OR REPLACE FUNCTION finance_owner_purge_invoice(
  p_invoice_id UUID,
  p_workspace_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM invoices
    WHERE id = p_invoice_id
      AND user_id = p_workspace_owner_id
  ) THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  ALTER TABLE finance_transactions DISABLE TRIGGER trg_finance_transactions_no_delete;
  DELETE FROM finance_transactions
  WHERE invoice_id = p_invoice_id
    AND user_id = p_workspace_owner_id;
  ALTER TABLE finance_transactions ENABLE TRIGGER trg_finance_transactions_no_delete;

  ALTER TABLE payment_links DISABLE TRIGGER trg_payment_links_no_delete;
  DELETE FROM payment_links
  WHERE invoice_id = p_invoice_id
    AND user_id = p_workspace_owner_id;
  ALTER TABLE payment_links ENABLE TRIGGER trg_payment_links_no_delete;

  ALTER TABLE invoices DISABLE TRIGGER trg_invoices_no_delete;
  DELETE FROM invoices
  WHERE id = p_invoice_id
    AND user_id = p_workspace_owner_id;
  ALTER TABLE invoices ENABLE TRIGGER trg_invoices_no_delete;
END;
$$;

REVOKE ALL ON FUNCTION finance_owner_purge_invoice(UUID, UUID) FROM PUBLIC;
