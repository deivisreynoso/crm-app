-- Read-only preflight audit: run in Supabase SQL Editor BEFORE any cleanup.
-- Save results; compare row counts after cleanup.

-- =============================================================================
-- 1) Missing columns the app expects (apply migrations 044–047 first if any show)
-- =============================================================================
SELECT 'missing_columns' AS check_group, column_name, expected_migration
FROM (
  VALUES
    ('google_gmail_tokens.has_read_access', '044_gmail_read_access_flag.sql'),
    ('contact_emails.mailbox_user_id', '046_contact_emails_mailbox_user.sql'),
    ('notification_preferences.email_notifications', '047_email_received_notifications.sql')
) AS expected(column_name, expected_migration)
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = split_part(expected.column_name, '.', 1)
    AND c.column_name = split_part(expected.column_name, '.', 2)
);

-- =============================================================================
-- 2) Orphan / legacy tables (safe to drop only when row counts confirm + no app use)
-- =============================================================================
SELECT 'orphan_table_counts' AS check_group, relname AS table_name, n_live_tup AS est_rows
FROM pg_stat_user_tables
WHERE relname IN (
  'automation_templates',
  'automation_triggers',
  'automation_executions',
  'whatsapp_message_templates',
  'gmail_oauth_tokens',
  'calendar_oauth_tokens'
)
ORDER BY relname;

-- =============================================================================
-- 3) Canonical OAuth tables (must remain — app reads/writes these)
-- =============================================================================
SELECT 'canonical_oauth_counts' AS check_group, relname AS table_name, n_live_tup AS est_rows
FROM pg_stat_user_tables
WHERE relname IN ('google_gmail_tokens', 'google_calendar_tokens')
ORDER BY relname;

-- Legacy vs canonical overlap (users with legacy token but no google_* row)
SELECT 'legacy_gmail_without_google' AS check_group, COUNT(*) AS users_affected
FROM gmail_oauth_tokens g
WHERE NOT EXISTS (
  SELECT 1 FROM google_gmail_tokens gg WHERE gg.user_id = g.user_id
);

SELECT 'legacy_calendar_without_google' AS check_group, COUNT(*) AS users_affected
FROM calendar_oauth_tokens c
WHERE NOT EXISTS (
  SELECT 1 FROM google_calendar_tokens gc WHERE gc.user_id = c.user_id
);

-- =============================================================================
-- 4) Automation / WhatsApp email template residue
-- =============================================================================
SELECT 'email_templates_by_category' AS check_group, COALESCE(category, '(null)') AS category, COUNT(*) AS n
FROM email_templates
GROUP BY category
ORDER BY n DESC;

SELECT 'automation_slug_templates' AS check_group, COUNT(*) AS n
FROM email_templates
WHERE slug IS NOT NULL
  AND slug <> ''
  AND category IS DISTINCT FROM 'review_request';

-- =============================================================================
-- 5) Unused calendar columns (app does not reference meet_link / ics_content)
-- =============================================================================
SELECT 'calendar_events_optional_cols' AS check_group,
  COUNT(*) FILTER (WHERE meet_link IS NOT NULL AND meet_link <> '') AS meet_link_set,
  COUNT(*) FILTER (WHERE ics_content IS NOT NULL AND ics_content <> '') AS ics_content_set
FROM calendar_events;

-- =============================================================================
-- 6) contact_emails health (sync performance)
-- =============================================================================
SELECT 'contact_emails_stats' AS check_group,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE mailbox_user_id IS NULL) AS missing_mailbox_user_id,
  COUNT(DISTINCT contact_id) AS distinct_contacts,
  COUNT(DISTINCT user_id) AS distinct_workspace_owners
FROM contact_emails;

-- Hot path: list emails for a contact (matches GET /api/contacts/[id]/emails)
-- Replace UUID with a real contact_id from your workspace for EXPLAIN ANALYZE:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id, direction, gmail_message_id, gmail_thread_id, sent_at
-- FROM contact_emails
-- WHERE user_id = 'WORKSPACE_OWNER_UUID'
--   AND contact_id = 'CONTACT_UUID'
-- ORDER BY sent_at ASC;

-- =============================================================================
-- 7) Tables in schema but no API routes yet (DO NOT drop without product sign-off)
-- =============================================================================
SELECT 'deferred_tables' AS check_group, relname AS table_name, n_live_tup AS est_rows
FROM pg_stat_user_tables
WHERE relname IN ('api_keys', 'custom_forms')
ORDER BY relname;

-- =============================================================================
-- 8) Index coverage on high-traffic filters
-- =============================================================================
SELECT 'indexes' AS check_group, indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('contact_emails', 'activities', 'notes', 'notifications', 'google_gmail_tokens')
ORDER BY tablename, indexname;
