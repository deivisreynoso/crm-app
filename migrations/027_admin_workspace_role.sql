-- Admin role: same workspace management as owner; full CRM writes (application-enforced).

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('sales', 'viewer', 'admin'));

COMMENT ON COLUMN team_members.role IS 'sales: full CRM; admin: CRM + settings/team; viewer: read-only demo';
