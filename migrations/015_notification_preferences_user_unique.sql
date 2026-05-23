-- Ensures one preferences row per user and id defaults for inserts.
CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_id_key
  ON notification_preferences (user_id);

ALTER TABLE notification_preferences
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
