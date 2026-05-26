-- Link Gmail-synced messages to service tickets (contact remains required for addressing)
ALTER TABLE contact_emails
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_emails_ticket_sent
  ON contact_emails (ticket_id, sent_at DESC)
  WHERE ticket_id IS NOT NULL;

COMMENT ON COLUMN contact_emails.ticket_id IS 'Optional ticket context when email was sent from a service ticket';
