-- CRM Enhancement Sprint: signatures, quote branding typography, MFA flags, calendar assignee

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email_signature_html TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.email_signature_html IS 'HTML email signature appended when composing via Gmail';
COMMENT ON COLUMN user_profiles.mfa_enabled IS 'User opted into MFA; enforced at login when true';

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS quote_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS quote_font_family TEXT;

COMMENT ON COLUMN user_settings.quote_primary_color IS 'Hex or CSS color for quote PDFs and public accept page';
COMMENT ON COLUMN user_settings.quote_font_family IS 'Font family name for quote branding';

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to
  ON calendar_events(assigned_to);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS acceptance_disclaimer_acknowledged_at TIMESTAMPTZ;
