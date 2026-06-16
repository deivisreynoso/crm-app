-- Dedicated project feedback records (alongside opportunity feedback fields).

CREATE TABLE project_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  opportunity_id        UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  feedback_token        TEXT NOT NULL UNIQUE,
  score                 INT CHECK (score BETWEEN 1 AND 5),
  what_worked_well      TEXT,
  what_to_improve       TEXT,
  would_recommend       TEXT CHECK (would_recommend IN ('yes', 'maybe', 'no')),
  google_review_sent    BOOLEAN DEFAULT false,
  google_review_sent_at TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ DEFAULT now(),
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX project_feedback_contact     ON project_feedback (contact_id);
CREATE INDEX project_feedback_opportunity ON project_feedback (opportunity_id);

ALTER TABLE project_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_feedback_select ON project_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = project_feedback.contact_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );

CREATE POLICY project_feedback_insert ON project_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = project_feedback.contact_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );

CREATE POLICY project_feedback_update ON project_feedback
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = project_feedback.contact_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );

CREATE POLICY project_feedback_delete ON project_feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = project_feedback.contact_id
        AND finance_actor_in_workspace(c.user_id)
    )
  );
