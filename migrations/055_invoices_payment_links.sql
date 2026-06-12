-- Finances Suite: invoices, payment links, invoice numbering

CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  quote_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'voided')),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'MXN')),
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  stripe_invoice_id TEXT,
  payment_link_id UUID,
  notes TEXT,
  footer_text TEXT,
  pdf_storage_path TEXT,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  stripe_payment_link_id TEXT,
  url TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'MXN')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paid', 'deactivated', 'expired')),
  paid_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON invoices(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_contact ON invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_user ON payment_links(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_links_invoice ON payment_links(invoice_id);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_active_per_quote
  ON invoices (user_id, quote_id)
  WHERE status != 'voided' AND quote_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_links_one_active_per_invoice
  ON payment_links (invoice_id)
  WHERE status = 'active';

ALTER TABLE finance_transactions
  ADD CONSTRAINT finance_transactions_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE finance_transactions
  ADD CONSTRAINT finance_transactions_payment_link_id_fkey
    FOREIGN KEY (payment_link_id) REFERENCES payment_links(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_payment_link_id_fkey
    FOREIGN KEY (payment_link_id) REFERENCES payment_links(id) ON DELETE SET NULL;

-- Invoice number generation on insert (when invoice_number is empty placeholder)
CREATE OR REPLACE FUNCTION assign_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  seq_year INT;
  next_num INT;
  prefix TEXT;
  start_num INT;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number <> '' THEN
    RETURN NEW;
  END IF;

  seq_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INT;

  SELECT COALESCE(invoice_number_prefix, 'INV-'), COALESCE(invoice_number_start, 1)
  INTO prefix, start_num
  FROM user_settings
  WHERE user_id = NEW.user_id;

  IF prefix IS NULL THEN
    prefix := 'INV-';
    start_num := 1;
  END IF;

  INSERT INTO invoice_number_sequences (user_id, year, last_number)
  VALUES (NEW.user_id, seq_year, start_num - 1)
  ON CONFLICT (user_id, year) DO NOTHING;

  UPDATE invoice_number_sequences
  SET last_number = last_number + 1
  WHERE user_id = NEW.user_id AND year = seq_year
  RETURNING last_number INTO next_num;

  NEW.invoice_number := prefix || seq_year::TEXT || '-' || lpad(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_assign_number ON invoices;
CREATE TRIGGER trg_invoices_assign_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION assign_invoice_number();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select ON invoices
  FOR SELECT USING (finance_actor_in_workspace(user_id));

CREATE POLICY invoices_mutate ON invoices
  FOR ALL USING (finance_actor_is_admin_or_owner(user_id))
  WITH CHECK (finance_actor_is_admin_or_owner(user_id));

CREATE POLICY payment_links_select ON payment_links
  FOR SELECT USING (finance_actor_in_workspace(user_id));

CREATE POLICY payment_links_mutate ON payment_links
  FOR ALL USING (finance_actor_is_admin_or_owner(user_id))
  WITH CHECK (finance_actor_is_admin_or_owner(user_id));

CREATE POLICY invoice_sequences_admin ON invoice_number_sequences
  FOR ALL USING (finance_actor_is_admin_or_owner(user_id))
  WITH CHECK (finance_actor_is_admin_or_owner(user_id));

DROP TRIGGER IF EXISTS trg_invoices_no_delete ON invoices;
CREATE TRIGGER trg_invoices_no_delete
  BEFORE DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION finance_prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_payment_links_no_delete ON payment_links;
CREATE TRIGGER trg_payment_links_no_delete
  BEFORE DELETE ON payment_links
  FOR EACH ROW EXECUTE FUNCTION finance_prevent_hard_delete();

-- Derive quote_id on income rows from invoice — never trust client input
CREATE OR REPLACE FUNCTION finance_sync_quote_from_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type = 'income' AND NEW.invoice_id IS NOT NULL THEN
    SELECT quote_id INTO NEW.quote_id
    FROM invoices
    WHERE id = NEW.invoice_id;
  ELSIF NEW.type = 'income' THEN
    NEW.quote_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_sync_quote_from_invoice ON finance_transactions;
CREATE TRIGGER trg_finance_sync_quote_from_invoice
  BEFORE INSERT OR UPDATE ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION finance_sync_quote_from_invoice();
