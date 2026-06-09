ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

COMMENT ON COLUMN notification_preferences.email_notifications IS
  'In-app alert when a contact reply is synced from Gmail';
