-- Sprint 5: quote expiry/versioning and loss reason tracking.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loss_reason TEXT,
  ADD COLUMN IF NOT EXISTS loss_reason_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_parent_document_id
  ON documents (parent_document_id)
  WHERE parent_document_id IS NOT NULL;

COMMENT ON COLUMN documents.expires_at IS 'Quote expiry; set on send from quote_default_expiry_days';
COMMENT ON COLUMN documents.version IS 'Quote revision number when re-editing sent/accepted quotes';
COMMENT ON COLUMN documents.parent_document_id IS 'Prior quote version when superseded';

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS loss_reason TEXT,
  ADD COLUMN IF NOT EXISTS loss_reason_notes TEXT;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS quote_default_expiry_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS loss_reason_options JSONB NOT NULL DEFAULT '[
    {"value":"price","label_en":"Price / budget","label_es":"Precio / presupuesto"},
    {"value":"timing","label_en":"Bad timing","label_es":"Mal momento"},
    {"value":"competitor","label_en":"Chose competitor","label_es":"Eligió competidor"},
    {"value":"scope","label_en":"Scope mismatch","label_es":"Alcance no encaja"},
    {"value":"no_response","label_en":"No response","label_es":"Sin respuesta"},
    {"value":"other","label_en":"Other","label_es":"Otro"}
  ]'::jsonb;

COMMENT ON COLUMN user_settings.quote_default_expiry_days IS 'Days until quote expires after send';
COMMENT ON COLUMN user_settings.loss_reason_options IS 'Configurable loss reason options for quotes/opportunities';
