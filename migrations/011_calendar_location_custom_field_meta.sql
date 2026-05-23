-- In-app calendar location types
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS location_type TEXT
  CHECK (location_type IS NULL OR location_type IN ('physical', 'zoom', 'google_meet', 'teams', 'other'));

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start
  ON calendar_events(user_id, start_time);

-- Custom field metadata for builder UI
ALTER TABLE custom_fields
  ADD COLUMN IF NOT EXISTS folder_name TEXT,
  ADD COLUMN IF NOT EXISTS placeholder TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;
