-- Customer-facing subject (reason for support), distinct from internal title
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS subject TEXT;

UPDATE tickets
SET subject = title
WHERE subject IS NULL OR subject = '';

-- Keep title in sync for list views
UPDATE tickets
SET title = COALESCE(NULLIF(subject, ''), title)
WHERE title IS NULL OR title = '';
