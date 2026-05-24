-- Website booking calendar guardrails (workspace owner settings)

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS booking_availability JSONB;

COMMENT ON COLUMN user_settings.booking_availability IS
  'Public booking form: timezone, allowed days, hours, lead time, horizon';
