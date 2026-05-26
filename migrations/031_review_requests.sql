-- Google review invitation settings and contact preferences
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS google_reviews_url TEXT,
  ADD COLUMN IF NOT EXISTS review_request_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS review_request_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN user_settings.google_reviews_url IS 'Public Google Business review link sent in review invitations';
COMMENT ON COLUMN user_settings.review_request_template_id IS 'Email template for review invitations';
COMMENT ON COLUMN contacts.review_request_opt_out IS 'When true, block review invitation sends to this contact';
COMMENT ON COLUMN contacts.review_requested_at IS 'Last time a Google review invitation was sent';

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check
  CHECK (type IN (
    'email', 'call', 'meeting', 'task', 'note', 'system', 'update', 'created', 'review_request'
  ));
