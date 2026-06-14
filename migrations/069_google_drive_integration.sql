-- Workspace Google Drive OAuth (one connection per workspace owner account)
CREATE TABLE IF NOT EXISTS google_drive_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  email_address TEXT,
  root_folder_id TEXT,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE google_drive_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owner manages google drive tokens" ON google_drive_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE google_drive_tokens IS 'Google Drive OAuth for workspace media — keyed by workspace owner user_id';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT;

COMMENT ON COLUMN documents.source IS 'upload | google_drive';
COMMENT ON COLUMN documents.external_id IS 'Google Drive file id when source=google_drive';
COMMENT ON COLUMN documents.external_url IS 'Google Drive webViewLink when source=google_drive';
