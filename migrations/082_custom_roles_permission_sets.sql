-- Salesforce-style custom roles and permission sets (additive grants; deny wins).

CREATE TABLE IF NOT EXISTS workspace_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_role TEXT NOT NULL DEFAULT 'sales'
    CHECK (base_role IN ('sales', 'viewer', 'admin', 'finance', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, name)
);

CREATE TABLE IF NOT EXISTS workspace_permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, name)
);

CREATE TABLE IF NOT EXISTS workspace_permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_role_id UUID REFERENCES workspace_custom_roles(id) ON DELETE CASCADE,
  permission_set_id UUID REFERENCES workspace_permission_sets(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (custom_role_id IS NOT NULL AND permission_set_id IS NULL)
    OR (custom_role_id IS NULL AND permission_set_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_permission_grants_custom_role_key
  ON workspace_permission_grants (custom_role_id, permission_key)
  WHERE custom_role_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_permission_grants_set_key
  ON workspace_permission_grants (permission_set_id, permission_key)
  WHERE permission_set_id IS NOT NULL;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS custom_role_id UUID
  REFERENCES workspace_custom_roles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS team_member_permission_sets (
  member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  permission_set_id UUID NOT NULL REFERENCES workspace_permission_sets(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, permission_set_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_custom_roles_owner
  ON workspace_custom_roles(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_permission_sets_owner
  ON workspace_permission_sets(owner_user_id);

COMMENT ON TABLE workspace_custom_roles IS
  'Custom CRM roles cloned from a standard role template with explicit permission grants.';

COMMENT ON TABLE workspace_permission_sets IS
  'Additive permission bundles assigned to users (Salesforce permission sets).';
