-- Contacts are the primary parent after Accounts UI removal.
-- Backfill contact_id where possible, remove orphan rows, then require contact on tickets and calendar events.

-- 1) Tickets: company-only → first contact on that company
UPDATE tickets t
SET contact_id = picked.contact_id
FROM (
  SELECT DISTINCT ON (t2.id)
    t2.id AS ticket_id,
    c.id AS contact_id
  FROM tickets t2
  JOIN contacts c
    ON c.company_id = t2.company_id
   AND c.user_id = t2.user_id
  WHERE t2.contact_id IS NULL
    AND t2.company_id IS NOT NULL
  ORDER BY t2.id, c.created_at ASC
) picked
WHERE t.id = picked.ticket_id;

-- 2) Calendar events: company-only → first contact on that company
UPDATE calendar_events e
SET contact_id = picked.contact_id
FROM (
  SELECT DISTINCT ON (e2.id)
    e2.id AS event_id,
    c.id AS contact_id
  FROM calendar_events e2
  JOIN contacts c
    ON c.company_id = e2.company_id
   AND c.user_id = e2.user_id
  WHERE e2.contact_id IS NULL
    AND e2.company_id IS NOT NULL
  ORDER BY e2.id, c.created_at ASC
) picked
WHERE e.id = picked.event_id;

-- 3) Calendar events: link via opportunity when present
UPDATE calendar_events e
SET contact_id = o.contact_id
FROM opportunities o
WHERE e.contact_id IS NULL
  AND e.opportunity_id IS NOT NULL
  AND e.opportunity_id = o.id
  AND o.contact_id IS NOT NULL;

-- 4) Documents: company-only → first contact on that company
UPDATE documents d
SET contact_id = picked.contact_id
FROM (
  SELECT DISTINCT ON (d2.id)
    d2.id AS document_id,
    c.id AS contact_id
  FROM documents d2
  JOIN contacts c
    ON c.company_id = d2.company_id
   AND c.user_id = d2.user_id
  WHERE d2.contact_id IS NULL
    AND d2.company_id IS NOT NULL
    AND d2.opportunity_id IS NULL
  ORDER BY d2.id, c.created_at ASC
) picked
WHERE d.id = picked.document_id;

-- 5) Orphan calendar events (standalone / no linkable parent) — allowed before migration 012
DELETE FROM calendar_events
WHERE contact_id IS NULL;

-- 6) Orphan tickets with no contact and no backfill path
DELETE FROM tickets
WHERE contact_id IS NULL;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_contact_or_company_check;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_contact_required_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_contact_required_check
  CHECK (contact_id IS NOT NULL);

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_parent_check;
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_contact_required_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_contact_required_check
  CHECK (contact_id IS NOT NULL);
