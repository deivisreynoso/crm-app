-- Migration 081: CID brute-force attempt tracking (optional persistence layer)
-- NOT APPLIED — review and apply via Supabase CLI or MCP after approval.
-- Rollback: DROP TABLE IF EXISTS support_cid_lockouts; DROP TABLE IF EXISTS support_cid_attempts;

CREATE TABLE IF NOT EXISTS support_cid_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  attempt_ip TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_support_cid_attempts_customer
  ON support_cid_attempts(customer_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_cid_attempts_ip
  ON support_cid_attempts(attempt_ip, attempted_at DESC);

CREATE TABLE IF NOT EXISTS support_cid_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  attempt_ip TEXT,
  locked_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_cid_lockouts_lookup
  ON support_cid_lockouts(customer_id, attempt_ip, locked_until);

COMMENT ON TABLE support_cid_attempts IS 'Audit log for public CID validation attempts';
COMMENT ON TABLE support_cid_lockouts IS 'Temporary lockouts after repeated CID failures';
