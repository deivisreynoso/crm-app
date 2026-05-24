-- Workspace roles + website lead assignment

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'sales'
  CHECK (role IN ('sales', 'viewer'));

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS default_sales_assignee UUID REFERENCES auth.users(id);

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);

COMMENT ON COLUMN team_members.role IS 'sales: full CRM access; viewer: read-only';
COMMENT ON COLUMN user_settings.default_sales_assignee IS 'Workspace owner setting: auto-assign website leads';
COMMENT ON COLUMN contacts.assigned_to IS 'Team member responsible for this contact/lead';
