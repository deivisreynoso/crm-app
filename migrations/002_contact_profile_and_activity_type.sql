-- Add contact profile fields and activity type on notes

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS preferred_language TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'note'
    CHECK (activity_type IN ('call', 'email', 'meeting', 'note'));

CREATE INDEX IF NOT EXISTS idx_notes_activity_type ON notes(activity_type);
