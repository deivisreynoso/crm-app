-- Supabase linter: pin search_path on finance/CID trigger helpers;
-- revoke RPC execute on SECURITY DEFINER helpers from anon/authenticated.

-- ---------------------------------------------------------------------------
-- search_path (lint 0011)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.contacts_customer_id_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.customer_id IS NOT NULL AND NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'customer_id is immutable once assigned';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_prevent_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed on %. Use void or deactivate instead.', TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_finance_categories_for_workspace(ws_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO finance_categories (user_id, kind, slug, label, is_system, sort_order)
  VALUES
    (ws_user_id, 'income', 'quote_payment', 'Quote Payment', true, 10),
    (ws_user_id, 'income', 'retainer', 'Retainer', true, 20),
    (ws_user_id, 'income', 'other_income', 'Other Income', true, 30),
    (ws_user_id, 'expense', 'payroll', 'Payroll', true, 10),
    (ws_user_id, 'expense', 'software', 'Software & Tools', true, 20),
    (ws_user_id, 'expense', 'marketing', 'Marketing', true, 30),
    (ws_user_id, 'expense', 'office', 'Office & Facilities', true, 40),
    (ws_user_id, 'expense', 'contractor', 'Contractors', true, 50),
    (ws_user_id, 'expense', 'other_expense', 'Other Expense', true, 60)
  ON CONFLICT (user_id, kind, slug) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.finance_sync_quote_from_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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

-- ---------------------------------------------------------------------------
-- RPC execute lockdown (lint 0028 / 0029)
-- CRM finance data is accessed via service-role API routes, not client RPC.
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.finance_actor_in_workspace(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_actor_in_workspace(UUID) FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.finance_actor_is_admin_or_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_actor_is_admin_or_owner(UUID) FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.finance_owner_purge_invoice(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_owner_purge_invoice(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_owner_purge_invoice(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.seed_finance_categories_for_workspace(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_finance_categories_for_workspace(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_finance_categories_for_workspace(UUID) TO service_role;
