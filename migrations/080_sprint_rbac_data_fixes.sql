-- Sprint 1: lead stage backfill, closed_lost on existing pipelines, finance/support roles

-- 1) Orphan website-lead opportunities used display name instead of stage id
UPDATE opportunities
SET stage = 'qualified', updated_at = now()
WHERE stage IN ('Qualified Lead', 'Qualified lead', 'Qualified');

-- 2) Append closed_lost stage when missing from pipeline JSON
UPDATE pipelines p
SET
  stages = p.stages || jsonb_build_array(
    jsonb_build_object(
      'id', 'closed_lost',
      'name', 'Closed - Lost',
      'order',
      COALESCE(
        (
          SELECT MAX((elem->>'order')::int) + 1
          FROM jsonb_array_elements(p.stages) AS elem
        ),
        5
      )
    )
  ),
  updated_at = now()
WHERE NOT EXISTS (
  SELECT 1
  FROM jsonb_array_elements(p.stages) AS elem
  WHERE elem->>'id' = 'closed_lost'
);

-- 3) Extend team member roles
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('sales', 'viewer', 'admin', 'finance', 'support'));

COMMENT ON COLUMN team_members.role IS
  'sales: own CRM records; support: all contacts + tickets/conversations; finance: finances; admin: workspace manage; viewer: read-only demo';
