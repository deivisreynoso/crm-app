-- Quote line items + service catalog + CRM UI locale

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ui_locale TEXT NOT NULL DEFAULT 'en'
  CHECK (ui_locale IN ('en', 'es'));

COMMENT ON COLUMN user_settings.ui_locale IS 'CRM dashboard language (en | es)';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS header_html TEXT,
  ADD COLUMN IF NOT EXISTS footer_html TEXT;

CREATE TABLE IF NOT EXISTS quote_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_services_user_id ON quote_services(user_id);

ALTER TABLE quote_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quote services" ON quote_services
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES quote_services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_line_items_document_id ON quote_line_items(document_id);

ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quote line items" ON quote_line_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
