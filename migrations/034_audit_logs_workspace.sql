-- Workspace-scoped audit logs: server writes (service role), admins read via CRM API.
-- Run after 033_audit_logs_rls.sql (RLS enabled + client REVOKE).

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS workspace_owner_id UUID REFERENCES auth.users(id);

UPDATE audit_logs al
SET workspace_owner_id = COALESCE(
  (
    SELECT tm.owner_user_id
    FROM team_members tm
    WHERE tm.member_user_id = al.user_id
    LIMIT 1
  ),
  al.user_id
)
WHERE workspace_owner_id IS NULL;

ALTER TABLE audit_logs
  ALTER COLUMN workspace_owner_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_owner_id
  ON audit_logs(workspace_owner_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_timestamp
  ON audit_logs(workspace_owner_id, timestamp DESC);

-- Explicit deny policies satisfy Supabase "RLS enabled but no policies" checks.
-- CRM reads/writes use the service role (bypasses RLS); anon/authenticated are REVOKEd in 033.

DROP POLICY IF EXISTS audit_logs_deny_anon ON audit_logs;
DROP POLICY IF EXISTS audit_logs_deny_authenticated ON audit_logs;

CREATE POLICY audit_logs_deny_anon ON audit_logs
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY audit_logs_deny_authenticated ON audit_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
