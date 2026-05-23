-- Service ticket numbers + account enrichment

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_ticket_number_user
  ON tickets(user_id, ticket_number)
  WHERE ticket_number IS NOT NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS revenue TEXT,
  ADD COLUMN IF NOT EXISTS account_summary TEXT;
