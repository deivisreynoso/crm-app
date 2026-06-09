-- Track which teammate's Gmail mailbox owns a thread (for syncing replies).
ALTER TABLE contact_emails
  ADD COLUMN IF NOT EXISTS mailbox_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_emails_mailbox_user
  ON contact_emails (mailbox_user_id)
  WHERE mailbox_user_id IS NOT NULL;

COMMENT ON COLUMN contact_emails.mailbox_user_id IS
  'CRM user whose connected Gmail account sent or owns this thread';

-- Backfill sender mailbox from activity log when possible.
UPDATE contact_emails ce
SET mailbox_user_id = a.created_by
FROM activities a
WHERE ce.mailbox_user_id IS NULL
  AND ce.direction = 'outbound'
  AND a.contact_id = ce.contact_id
  AND a.type = 'email'
  AND a.metadata->>'gmail_message_id' = ce.gmail_message_id
  AND a.created_by IS NOT NULL;
