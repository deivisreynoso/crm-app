-- Track which workspace user created each note/activity for timeline transparency.

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE notes SET created_by = user_id WHERE created_by IS NULL;
UPDATE activities SET created_by = user_id WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);
