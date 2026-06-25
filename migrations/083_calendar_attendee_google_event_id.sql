-- Track each additional team member's individual Google Calendar event ID.
-- Enables direct create/update/delete in their calendar when they have Calendar connected.

ALTER TABLE calendar_event_attendees
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;
