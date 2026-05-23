-- Email messages per contact (sent from CRM + synced from Gmail)
CREATE TABLE IF NOT EXISTS contact_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT,
  from_email TEXT,
  to_email TEXT,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_emails_contact_sent
  ON contact_emails (contact_id, sent_at DESC);

ALTER TABLE contact_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contact emails" ON contact_emails
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
