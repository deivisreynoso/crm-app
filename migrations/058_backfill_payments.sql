-- Backfill legacy payments into finance_transactions, then drop payments table

CREATE TABLE IF NOT EXISTS _migration_058_backfill_log (
  payment_id UUID PRIMARY KEY,
  reason TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE
  pay RECORD;
  cat_id UUID;
  parsed_quote_id UUID;
  resolved_invoice_id UUID;
  pay_currency TEXT;
  pay_source TEXT;
  inserted_count INT := 0;
  skipped_count INT := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    RAISE NOTICE 'payments table already dropped — skipping backfill';
    RETURN;
  END IF;

  FOR pay IN SELECT * FROM payments ORDER BY created_at LOOP
    PERFORM seed_finance_categories_for_workspace(pay.user_id);

    SELECT id INTO cat_id
    FROM finance_categories
    WHERE user_id = pay.user_id AND kind = 'income' AND slug = 'quote_payment'
    LIMIT 1;

    parsed_quote_id := NULL;
    resolved_invoice_id := NULL;

    IF pay.notes ~ '^Quote payment \(([0-9a-fA-F-]{36})\)$' THEN
      parsed_quote_id := (regexp_match(pay.notes, '^Quote payment \(([0-9a-fA-F-]{36})\)$'))[1]::UUID;
    END IF;

    IF parsed_quote_id IS NOT NULL THEN
      SELECT id INTO resolved_invoice_id
      FROM invoices
      WHERE user_id = pay.user_id
        AND quote_id = parsed_quote_id
        AND status != 'voided'
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    pay_currency := UPPER(TRIM(COALESCE(pay.currency, '')));
    IF pay_currency NOT IN ('USD', 'MXN') THEN
      SELECT default_currency INTO pay_currency FROM user_settings WHERE user_id = pay.user_id;
      IF pay_currency IS NULL OR pay_currency NOT IN ('USD', 'MXN') THEN
        pay_currency := 'USD';
      END IF;
    END IF;

    IF resolved_invoice_id IS NULL THEN
      INSERT INTO _migration_058_backfill_log (payment_id, reason)
      VALUES (
        pay.id,
        CASE
          WHEN parsed_quote_id IS NULL THEN
            'no resolvable invoice_id: quote_id not parseable from notes: ' || COALESCE(pay.notes, '(empty)')
          ELSE
            'no resolvable invoice_id: no active invoice for quote ' || parsed_quote_id::TEXT
        END
      )
      ON CONFLICT DO NOTHING;
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    pay_source := CASE
      WHEN pay.stripe_payment_id IS NOT NULL THEN 'stripe_checkout'
      ELSE 'import'
    END;

    INSERT INTO finance_transactions (
      user_id,
      type,
      category_id,
      amount,
      currency,
      status,
      source,
      direction,
      invoice_id,
      contact_id,
      stripe_payment_intent_id,
      description,
      notes,
      payment_method,
      transaction_date,
      legacy_payment_id,
      created_at,
      updated_at
    ) VALUES (
      pay.user_id,
      'income',
      cat_id,
      pay.amount,
      pay_currency,
      'completed',
      pay_source,
      'inbound',
      resolved_invoice_id,
      pay.contact_id,
      pay.stripe_payment_id,
      COALESCE(pay.notes, 'Imported payment'),
      pay.notes,
      pay.payment_method,
      COALESCE(pay.created_at::DATE, CURRENT_DATE),
      pay.id,
      pay.created_at,
      pay.updated_at
    )
    ON CONFLICT DO NOTHING;

    inserted_count := inserted_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled % payment rows, skipped %', inserted_count, skipped_count;
END;
$$;

-- Verify counts before drop: backfilled + skipped = total payments
DO $$
DECLARE
  payments_count INT;
  backfill_count INT;
  skipped_count INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO payments_count FROM payments;
  SELECT COUNT(*) INTO backfill_count FROM finance_transactions WHERE legacy_payment_id IS NOT NULL;
  SELECT COUNT(*) INTO skipped_count FROM _migration_058_backfill_log;

  IF payments_count <> backfill_count + skipped_count THEN
    RAISE EXCEPTION 'Backfill verification failed: payments=% backfilled=% skipped=%',
      payments_count, backfill_count, skipped_count;
  END IF;

  RAISE NOTICE 'Backfill verified: % backfilled, % skipped', backfill_count, skipped_count;
END;
$$;

DROP TABLE IF EXISTS payments CASCADE;

-- Recalculate quote payment status via invoice → transactions chain
UPDATE documents d
SET
  amount_paid = COALESCE(agg.paid, 0),
  payment_status = CASE
    WHEN COALESCE(agg.paid, 0) <= 0 THEN 'unpaid'
    WHEN COALESCE(agg.paid, 0) >= COALESCE(d.total_amount, 0) THEN 'paid'
    ELSE 'partially_paid'
  END
FROM (
  SELECT
    i.quote_id,
    SUM(ft.amount) AS paid
  FROM finance_transactions ft
  JOIN invoices i ON i.id = ft.invoice_id
  WHERE ft.type = 'income'
    AND ft.direction = 'inbound'
    AND ft.status = 'completed'
    AND i.quote_id IS NOT NULL
    AND i.status != 'voided'
  GROUP BY i.quote_id
) agg
WHERE d.id = agg.quote_id;
