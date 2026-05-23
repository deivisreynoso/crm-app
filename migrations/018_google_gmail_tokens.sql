-- Gmail OAuth tokens (per user). Required for Gmail connect/send at any volume —
-- stores your Google refresh token (one row per user), not bulk-mail quotas.
CREATE TABLE IF NOT EXISTS google_gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  email_address TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE google_gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own google gmail tokens" ON google_gmail_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
