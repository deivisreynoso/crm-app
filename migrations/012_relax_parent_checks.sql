-- Allow standalone documents (draft workspace) and calendar events without a linked record.
-- Migration 005 required contact_id OR company_id OR opportunity_id; that blocked
-- "New document" and events created from the calendar without selecting a contact.

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_parent_check;

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_parent_check;
