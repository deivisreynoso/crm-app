-- Store Supabase storage path for signed download URLs (private bucket)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON documents(storage_path)
  WHERE storage_path IS NOT NULL;
