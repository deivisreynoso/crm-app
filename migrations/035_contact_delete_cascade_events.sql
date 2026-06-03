-- Delete calendar events when a contact is deleted (not orphan appointments).

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_contact_id_fkey;

ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
