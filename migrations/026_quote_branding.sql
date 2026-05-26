-- Quote branding: company logo + display name on estimates

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS quote_logo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS quote_company_name TEXT;

COMMENT ON COLUMN user_settings.quote_logo_storage_path IS 'Supabase storage path for quote PDF/preview logo (PNG/WebP, ~400×120px)';
COMMENT ON COLUMN user_settings.quote_company_name IS 'Company name shown on quotes when set';
