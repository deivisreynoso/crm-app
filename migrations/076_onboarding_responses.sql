-- Structured onboarding questionnaire responses (separate from contact profile updates).

CREATE TABLE onboarding_responses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id                UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  opportunity_id            UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  onboarding_token          TEXT NOT NULL,
  business_name             TEXT,
  website_url               TEXT,
  ecommerce_platform        TEXT,
  whatsapp_number           TEXT,
  technical_contact_name    TEXT,
  technical_contact_email   TEXT,
  pain_points               JSONB,
  existing_tools            TEXT,
  logo_storage_path         TEXT,
  brand_colors              TEXT,
  preferred_language        TEXT,
  escalation_channel        JSONB,
  suggested_integrations    JSONB,
  additional_notes          TEXT,
  submitted_at              TIMESTAMPTZ DEFAULT now(),
  created_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX onboarding_responses_contact
  ON onboarding_responses (contact_id);
CREATE INDEX onboarding_responses_opportunity
  ON onboarding_responses (opportunity_id);

ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_responses_select ON onboarding_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = onboarding_responses.contact_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );

CREATE POLICY onboarding_responses_insert ON onboarding_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = onboarding_responses.contact_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );

CREATE POLICY onboarding_responses_delete ON onboarding_responses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = onboarding_responses.contact_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );
