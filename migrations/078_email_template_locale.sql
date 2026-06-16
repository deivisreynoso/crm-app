-- Locale-aware email templates (quote_send EN + ES).

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_email_templates_user_category_locale
  ON email_templates (user_id, category, locale);

COMMENT ON COLUMN email_templates.locale IS 'Template locale: en or es';
