-- Cache Gmail read-scope result to avoid live API probes on every settings load.
ALTER TABLE google_gmail_tokens
  ADD COLUMN IF NOT EXISTS has_read_access BOOLEAN DEFAULT false;

COMMENT ON COLUMN google_gmail_tokens.has_read_access IS
  'Set on OAuth connect when gmail.readonly scope is verified';
