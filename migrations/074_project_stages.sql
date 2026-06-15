-- Project stages on won opportunities, feedback tokens, advocacy settings.

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS project_stage TEXT CHECK (project_stage IN ('onboarding', 'design', 'setup', 'launch', 'optimization', 'complete', 'maintenance')),
  ADD COLUMN IF NOT EXISTS project_stage_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS project_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS project_feedback_token TEXT,
  ADD COLUMN IF NOT EXISTS feedback_score INT CHECK (feedback_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback_notes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS feedback_received_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_project_feedback_token
  ON opportunities (project_feedback_token)
  WHERE project_feedback_token IS NOT NULL;

COMMENT ON COLUMN opportunities.project_stage IS 'Post-sale delivery stage; NULL until pipeline stage is Won';
COMMENT ON COLUMN opportunities.project_feedback_token IS 'Public token for /project-feedback/{token}';
COMMENT ON COLUMN opportunities.feedback_notes IS 'Structured project feedback: what_worked, what_to_improve, would_recommend';

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS project_stages_settings JSONB;

COMMENT ON COLUMN user_settings.project_stages_settings IS 'Project stage labels, maintenance toggle, review guardrail thresholds';
