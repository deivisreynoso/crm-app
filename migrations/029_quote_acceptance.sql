-- Customer accept/reject links and response tracking

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS accept_token TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_name TEXT,
  ADD COLUMN IF NOT EXISTS response_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_accept_token
  ON documents (accept_token)
  WHERE accept_token IS NOT NULL;

COMMENT ON COLUMN documents.accept_token IS 'Secret token for public accept/reject page';
COMMENT ON COLUMN documents.sent_at IS 'When quote was first sent to customer';
COMMENT ON COLUMN documents.accepted_at IS 'When customer accepted via public link';
COMMENT ON COLUMN documents.rejected_at IS 'When customer declined via public link';
