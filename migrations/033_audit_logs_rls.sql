-- Lock down audit_logs: server-only via service role.
-- Then run 034_audit_logs_workspace.sql for workspace_owner_id + explicit deny policies.
-- Service role bypasses RLS and continues to work from Next.js API routes.

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON audit_logs FROM anon, authenticated;
