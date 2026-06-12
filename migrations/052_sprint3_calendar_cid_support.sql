-- Sprint 3: per-user calendar colors, appointment ownership, CID, support widget, ticket source

-- Per-user calendar event colors
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS calendar_color TEXT;

COMMENT ON COLUMN user_profiles.calendar_color IS 'Hex color for calendar events owned by this user';

-- Track which CRM user Google Calendar synced an event (preserves legacy sync on update/delete)
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_type TEXT,
  ADD COLUMN IF NOT EXISTS google_sync_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to
  ON calendar_events(assigned_to);

CREATE INDEX IF NOT EXISTS idx_calendar_events_google_sync_user
  ON calendar_events(google_sync_user_id);

-- Backfill appointment owners from workspace owner when missing
UPDATE calendar_events
SET assigned_to = user_id
WHERE assigned_to IS NULL;

-- Normalize deprecated location types (zoom/teams removed from UI; column may predate migration 011 on some DBs)
UPDATE calendar_events
SET location_type = 'other'
WHERE location_type IN ('zoom', 'teams');

-- Customer identification number on contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_customer_id
  ON contacts (user_id, lower(customer_id))
  WHERE customer_id IS NOT NULL;

CREATE OR REPLACE FUNCTION contacts_customer_id_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.customer_id IS NOT NULL AND NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'customer_id is immutable once assigned';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_customer_id_immutable ON contacts;
CREATE TRIGGER trg_contacts_customer_id_immutable
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION contacts_customer_id_immutable();

-- Ticket source: internal CRM vs public support widget
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal';

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_source_check;
ALTER TABLE tickets
  ADD CONSTRAINT tickets_source_check
  CHECK (source IN ('internal', 'website_widget'));

-- Support widget settings (workspace owner user_settings row)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS support_widget_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS support_widget_assignee UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS support_widget_email_notify BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN user_settings.support_widget_enabled IS 'When true, public /support page accepts CID validation';
COMMENT ON COLUMN user_settings.support_widget_assignee IS 'Default assignee for tickets from support widget';
COMMENT ON COLUMN user_settings.support_widget_email_notify IS 'Email contact on new widget ticket (via Gmail)';

-- Short-lived sessions after CID validation (public support widget)
CREATE TABLE IF NOT EXISTS support_cid_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_cid_sessions_expires ON support_cid_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_support_cid_sessions_workspace ON support_cid_sessions(workspace_owner_id);
