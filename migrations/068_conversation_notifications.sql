-- In-app alerts when WhatsApp/webchat conversations need human review.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS conversation_notifications BOOLEAN DEFAULT true;

COMMENT ON COLUMN notification_preferences.conversation_notifications IS
  'In-app alerts when a WhatsApp or webchat conversation needs human review.';
