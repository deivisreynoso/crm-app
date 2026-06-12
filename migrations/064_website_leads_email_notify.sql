-- Email assignee when a new website lead arrives (form or webchat).

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS website_leads_email_notify BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN user_settings.website_leads_email_notify IS
  'When true, default sales assignee receives email for new website leads.';
