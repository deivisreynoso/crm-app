-- DB cleanup: remove schema from abandoned automations / WhatsApp / legacy OAuth.
-- Run scripts/db-preflight-audit.sql first and review output.
--
-- RISK SUMMARY
-- - Dropping automation_* / whatsapp_*: LOW if counts are small/zero (no app code).
-- - Dropping gmail_oauth_tokens / calendar_oauth_tokens: MEDIUM — migrate rows first.
-- - Dropping meet_link / ics_content: LOW (unused in app; data loss only if you used Meet links).
-- - Dropping email_templates.slug: LOW after automation templates deleted.
--
-- TEST PLAN (staging or maintenance window)
-- 1) BEGIN; \i this file; ROLLBACK;  — dry run
-- 2) BEGIN; \i this file; COMMIT;
-- 3) VACUUM (ANALYZE) contact_emails, calendar_events, email_templates;
-- 4) Re-run db-preflight-audit.sql and smoke-test: Settings→Integrations, send email, sync, calendar.

-- ---------------------------------------------------------------------------
-- Phase A: ensure pending app migrations (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE google_gmail_tokens
  ADD COLUMN IF NOT EXISTS has_read_access BOOLEAN DEFAULT false;

ALTER TABLE contact_emails
  ADD COLUMN IF NOT EXISTS mailbox_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_emails_mailbox_user
  ON contact_emails (mailbox_user_id)
  WHERE mailbox_user_id IS NOT NULL;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Sync performance: workspace-scoped contact email listing
CREATE INDEX IF NOT EXISTS idx_contact_emails_user_contact_sent
  ON contact_emails (user_id, contact_id, sent_at DESC);

-- Activity dedupe by gmail_message_id (email sync logging)
CREATE INDEX IF NOT EXISTS idx_activities_contact_email_gmail
  ON activities (contact_id, type)
  WHERE type = 'email';

-- ---------------------------------------------------------------------------
-- Phase B: remove automation email template rows (if 045 was not applied)
-- ---------------------------------------------------------------------------
DELETE FROM email_templates WHERE category = 'automation';

DO $$
BEGIN
  DELETE FROM email_templates
  WHERE slug IN (
    'quote_accepted',
    'quote_accepted_internal',
    'quote_declined_alert',
    'appointment_confirmation',
    'appointment_confirmation_internal',
    'appointment_reminder_24h',
    'appointment_reminder_1h',
    'new_lead_alert',
    'overdue_task_alert',
    'ticket_confirmation',
    'ticket_alert_internal'
  );
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Backfill mailbox_user_id when column was just added
UPDATE contact_emails ce
SET mailbox_user_id = a.created_by
FROM activities a
WHERE ce.mailbox_user_id IS NULL
  AND ce.direction = 'outbound'
  AND a.contact_id = ce.contact_id
  AND a.type = 'email'
  AND a.metadata->>'gmail_message_id' = ce.gmail_message_id
  AND a.created_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Phase C: migrate legacy OAuth rows into canonical tables (then drop legacy)
-- ---------------------------------------------------------------------------
INSERT INTO google_gmail_tokens (
  user_id,
  access_token,
  refresh_token,
  expires_at,
  email_address,
  updated_at
)
SELECT
  g.user_id,
  g.access_token,
  g.refresh_token,
  g.token_expiry,
  g.email_address,
  COALESCE(g.updated_at, now())
FROM gmail_oauth_tokens g
WHERE NOT EXISTS (
  SELECT 1 FROM google_gmail_tokens gg WHERE gg.user_id = g.user_id
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO google_calendar_tokens (
  user_id,
  access_token,
  refresh_token,
  expires_at,
  calendar_id,
  updated_at
)
SELECT
  c.user_id,
  c.access_token,
  c.refresh_token,
  c.token_expiry,
  c.calendar_id,
  COALESCE(c.updated_at, now())
FROM calendar_oauth_tokens c
WHERE NOT EXISTS (
  SELECT 1 FROM google_calendar_tokens gc WHERE gc.user_id = c.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Phase D: drop orphan tables (automations + WhatsApp + legacy OAuth)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS automation_triggers CASCADE;
DROP TABLE IF EXISTS automation_executions CASCADE;
DROP TABLE IF EXISTS automation_templates CASCADE;
DROP TABLE IF EXISTS whatsapp_message_templates CASCADE;
DROP TABLE IF EXISTS gmail_oauth_tokens CASCADE;
DROP TABLE IF EXISTS calendar_oauth_tokens CASCADE;

-- ---------------------------------------------------------------------------
-- Phase E: drop unused columns
-- ---------------------------------------------------------------------------
ALTER TABLE calendar_events DROP COLUMN IF EXISTS meet_link;
ALTER TABLE calendar_events DROP COLUMN IF EXISTS ics_content;

ALTER TABLE email_templates DROP COLUMN IF EXISTS slug;

-- ---------------------------------------------------------------------------
-- Phase F: refresh planner stats
-- ---------------------------------------------------------------------------
ANALYZE contact_emails;
ANALYZE email_templates;
ANALYZE calendar_events;
ANALYZE google_gmail_tokens;
ANALYZE google_calendar_tokens;
ANALYZE notification_preferences;
