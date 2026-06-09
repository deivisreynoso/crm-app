-- Denormalized author label so timeline always shows who created the record.

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS created_by_display_name TEXT;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS created_by_display_name TEXT;

UPDATE notes n
SET created_by_display_name = COALESCE(NULLIF(TRIM(p.display_name), ''), p.email)
FROM user_profiles p
WHERE n.created_by = p.id
  AND n.created_by_display_name IS NULL;

UPDATE activities a
SET created_by_display_name = COALESCE(NULLIF(TRIM(p.display_name), ''), p.email)
FROM user_profiles p
WHERE a.created_by = p.id
  AND a.created_by_display_name IS NULL;
