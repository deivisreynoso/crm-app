-- Salesforce-style associations: Account (company) + Contact on shared child objects

-- Tickets: link to account and/or contact (at least one required)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE tickets
  ALTER COLUMN contact_id DROP NOT NULL;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_contact_or_company_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_contact_or_company_check
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tickets_company_id ON tickets(company_id);

-- Opportunities: optional direct account link (in addition to contact)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON opportunities(company_id);

-- Documents: account + contact + file metadata
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_parent_check;
ALTER TABLE documents ADD CONSTRAINT documents_parent_check
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL OR opportunity_id IS NOT NULL);

-- Calendar: account + contact
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_company_id ON calendar_events(company_id);

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_parent_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_parent_check
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL OR opportunity_id IS NOT NULL);

-- Tasks: optional account
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);

-- Allow attachment document type
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN ('contract', 'estimate', 'proposal', 'attachment'));
