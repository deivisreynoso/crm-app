-- Finances Suite: categories, transactions ledger, workspace helpers

-- Workspace access helpers (RLS)
CREATE OR REPLACE FUNCTION finance_actor_in_workspace(ws_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = ws_user_id
    OR EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.owner_user_id = ws_user_id
        AND tm.member_user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION finance_actor_is_admin_or_owner(ws_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = ws_user_id
    OR EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.owner_user_id = ws_user_id
        AND tm.member_user_id = auth.uid()
        AND tm.role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION finance_prevent_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletes are not allowed on %. Use void or deactivate instead.', TG_TABLE_NAME;
END;
$$;

-- Categories
CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, slug)
);

CREATE INDEX IF NOT EXISTS idx_finance_categories_user_kind
  ON finance_categories(user_id, kind, sort_order);

-- Transactions ledger
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'refund', 'adjustment')),
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'MXN')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'voided')),
  source TEXT NOT NULL
    CHECK (source IN ('manual', 'stripe_payment_link', 'stripe_checkout', 'invoice', 'import')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  quote_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  invoice_id UUID,
  payment_link_id UUID,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_checkout_session_id TEXT,
  description TEXT,
  notes TEXT,
  payment_method TEXT,
  vendor_name TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  recurrence_rule JSONB,
  recurrence_parent_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  is_recurring_parent BOOLEAN NOT NULL DEFAULT false,
  reverses_transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  void_reason TEXT,
  legacy_payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT finance_transactions_void_fields CHECK (
    status <> 'voided' OR voided_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date
  ON finance_transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_type_status
  ON finance_transactions(user_id, type, status);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_quote
  ON finance_transactions(quote_id) WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_contact
  ON finance_transactions(contact_id) WHERE contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_transactions_stripe_pi
  ON finance_transactions(user_id, stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_transactions_stripe_checkout
  ON finance_transactions(user_id, stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_transactions_legacy_payment
  ON finance_transactions(legacy_payment_id)
  WHERE legacy_payment_id IS NOT NULL;

-- Seed system categories for a workspace owner
CREATE OR REPLACE FUNCTION seed_finance_categories_for_workspace(ws_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
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

-- Seed for existing workspace owners
DO $$
DECLARE
  ws_id UUID;
BEGIN
  FOR ws_id IN
    SELECT DISTINCT user_id FROM user_settings
    UNION
    SELECT DISTINCT user_id FROM documents
    UNION
    SELECT id FROM auth.users
  LOOP
    PERFORM seed_finance_categories_for_workspace(ws_id);
  END LOOP;
END;
$$;

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_categories_select ON finance_categories
  FOR SELECT USING (finance_actor_in_workspace(user_id));

CREATE POLICY finance_categories_mutate ON finance_categories
  FOR ALL USING (finance_actor_is_admin_or_owner(user_id))
  WITH CHECK (finance_actor_is_admin_or_owner(user_id));

CREATE POLICY finance_transactions_select ON finance_transactions
  FOR SELECT USING (
    finance_actor_in_workspace(user_id)
    AND (
      type <> 'expense'
      OR finance_actor_is_admin_or_owner(user_id)
    )
  );

CREATE POLICY finance_transactions_insert ON finance_transactions
  FOR INSERT WITH CHECK (finance_actor_is_admin_or_owner(user_id));

CREATE POLICY finance_transactions_update ON finance_transactions
  FOR UPDATE USING (finance_actor_is_admin_or_owner(user_id))
  WITH CHECK (finance_actor_is_admin_or_owner(user_id));

DROP TRIGGER IF EXISTS trg_finance_transactions_no_delete ON finance_transactions;
CREATE TRIGGER trg_finance_transactions_no_delete
  BEFORE DELETE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION finance_prevent_hard_delete();

-- Income rows must reference an invoice (enforced after invoices exist in 055)
ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_income_requires_invoice;
ALTER TABLE finance_transactions
  ADD CONSTRAINT finance_transactions_income_requires_invoice
  CHECK (type != 'income' OR invoice_id IS NOT NULL);
