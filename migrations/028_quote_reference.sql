-- Unique human-readable reference per quote (per workspace owner)

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS quote_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_quote_reference
  ON documents (user_id, quote_reference)
  WHERE quote_reference IS NOT NULL;

COMMENT ON COLUMN documents.quote_reference IS 'Display reference e.g. Q-2026-00001; assigned on quote create';
