-- Allow contact/opportunity deletion without FK errors on historical records

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_contact_id_fkey,
  ADD CONSTRAINT documents_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_opportunity_id_fkey,
  ADD CONSTRAINT documents_opportunity_id_fkey
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_contact_id_fkey,
  ADD CONSTRAINT payments_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_opportunity_id_fkey,
  ADD CONSTRAINT payments_opportunity_id_fkey
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_contact_id_fkey,
  ADD CONSTRAINT calendar_events_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_opportunity_id_fkey,
  ADD CONSTRAINT calendar_events_opportunity_id_fkey
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;
