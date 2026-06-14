-- Sprint 5: onboarding tokens, automation webhooks, session timeout.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS onboarding_token TEXT,
  ADD COLUMN IF NOT EXISTS feedback_token TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_onboarding_token
  ON contacts (onboarding_token)
  WHERE onboarding_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_feedback_token
  ON contacts (feedback_token)
  WHERE feedback_token IS NOT NULL;

COMMENT ON COLUMN contacts.onboarding_token IS 'Public token for /onboarding/{token} questionnaire';
COMMENT ON COLUMN contacts.feedback_token IS 'Public token for /feedback/{token} post-delivery survey';

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS outbound_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS outbound_webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS outbound_webhook_events JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_task_template JSONB,
  ADD COLUMN IF NOT EXISTS appointment_reminder_settings JSONB,
  ADD COLUMN IF NOT EXISTS session_timeout_hours INTEGER;

COMMENT ON COLUMN user_settings.outbound_webhook_url IS 'N8N or external webhook URL for CRM automation events';
COMMENT ON COLUMN user_settings.outbound_webhook_events IS 'Enabled event names; empty array means all events';
COMMENT ON COLUMN user_settings.onboarding_task_template IS 'Bilingual task checklist template for onboarding automation';
COMMENT ON COLUMN user_settings.appointment_reminder_settings IS 'Reminder offsets and channels for appointment.created/updated';
COMMENT ON COLUMN user_settings.session_timeout_hours IS 'Idle session timeout in hours; null disables enforced timeout';

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_url TEXT NOT NULL,
  status_code INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_workspace_created
  ON webhook_deliveries (workspace_owner_id, created_at DESC);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owner can view webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (auth.uid() = workspace_owner_id);
