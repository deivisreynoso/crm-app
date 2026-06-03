-- Orphan notes when parent records are deleted (notes.entity_id has no FK).
-- Composite indexes for common workspace list + activity feed queries.

CREATE OR REPLACE FUNCTION delete_notes_for_entity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM notes
  WHERE entity_type = TG_ARGV[0]
    AND entity_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS contacts_delete_notes ON contacts;
CREATE TRIGGER contacts_delete_notes
  BEFORE DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION delete_notes_for_entity('contact');

DROP TRIGGER IF EXISTS opportunities_delete_notes ON opportunities;
CREATE TRIGGER opportunities_delete_notes
  BEFORE DELETE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION delete_notes_for_entity('opportunity');

DROP TRIGGER IF EXISTS tickets_delete_notes ON tickets;
CREATE TRIGGER tickets_delete_notes
  BEFORE DELETE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION delete_notes_for_entity('ticket');

CREATE INDEX IF NOT EXISTS idx_contacts_user_created
  ON contacts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_user_created
  ON tickets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_contact_created
  ON activities(user_id, contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_entity_created
  ON notes(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_contact_id
  ON tasks(contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_emails_user_contact_sent
  ON contact_emails(user_id, contact_id, sent_at DESC);
