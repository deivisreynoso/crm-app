-- Force-detach a Supabase Auth user from CRM rows, then delete in Authentication → Users.
--
-- 1. Run migrations/049_auth_user_delete_fks.sql first (once).
-- 2. Set target_user_id and user_email below.
-- 3. Run this entire script in Supabase SQL Editor.
-- 4. Delete the user in Dashboard → Authentication → Users.

DO $$
DECLARE
  target_user_id uuid := 'be6334bf-0947-4f85-8301-57dbd6460970';  -- ibethrivero@gmail.com
  user_email text := 'ibethrivero@gmail.com';
BEGIN
  -- Actor / assignee references (do not delete workspace CRM data owned by the tenant)
  UPDATE audit_logs SET user_id = NULL WHERE user_id = target_user_id;
  UPDATE notes SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE activities SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE contacts SET assigned_to = NULL WHERE assigned_to = target_user_id;
  UPDATE tasks SET assigned_to = NULL WHERE assigned_to = target_user_id;
  UPDATE tickets SET assigned_to = NULL WHERE assigned_to = target_user_id;
  UPDATE opportunities SET owner_id = NULL WHERE owner_id = target_user_id;
  UPDATE user_settings SET default_sales_assignee = NULL WHERE default_sales_assignee = target_user_id;
  UPDATE contact_emails SET mailbox_user_id = NULL WHERE mailbox_user_id = target_user_id;

  -- Team / profile rows for this login
  DELETE FROM team_members WHERE member_user_id = target_user_id;
  DELETE FROM team_invites WHERE lower(email) = lower(user_email);
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- Integration tokens (safe to remove for this login)
  DELETE FROM google_gmail_tokens WHERE user_id = target_user_id;
  DELETE FROM google_calendar_tokens WHERE user_id = target_user_id;

  RAISE NOTICE 'Detached user %. Now delete them in Authentication → Users.', target_user_id;
END $$;

-- Optional: see remaining public references (should return 0 rows)
SELECT table_name, column_name, count(*) AS rows
FROM (
  SELECT 'audit_logs' AS table_name, 'user_id' AS column_name FROM audit_logs WHERE user_id = 'be6334bf-0947-4f85-8301-57dbd6460970'
  UNION ALL SELECT 'notes', 'created_by' FROM notes WHERE created_by = 'be6334bf-0947-4f85-8301-57dbd6460970'
  UNION ALL SELECT 'activities', 'created_by' FROM activities WHERE created_by = 'be6334bf-0947-4f85-8301-57dbd6460970'
  UNION ALL SELECT 'opportunities', 'owner_id' FROM opportunities WHERE owner_id = 'be6334bf-0947-4f85-8301-57dbd6460970'
  UNION ALL SELECT 'team_members', 'member_user_id' FROM team_members WHERE member_user_id = 'be6334bf-0947-4f85-8301-57dbd6460970'
  UNION ALL SELECT 'user_profiles', 'id' FROM user_profiles WHERE id = 'be6334bf-0947-4f85-8301-57dbd6460970'
) refs
GROUP BY table_name, column_name;
