-- Repair workspace link when team_members.email matches auth user but member_user_id is wrong.
-- Run in Supabase SQL Editor, then have the user sign in again.

UPDATE team_members tm
SET member_user_id = au.id
FROM auth.users au
WHERE lower(tm.email) = lower(au.email)
  AND (tm.member_user_id IS NULL OR tm.member_user_id <> au.id)
  AND tm.email = 'elizabeth@clickin360.com';

-- Verify
SELECT tm.email, tm.member_user_id, au.email AS auth_email
FROM team_members tm
LEFT JOIN auth.users au ON au.id = tm.member_user_id
WHERE lower(tm.email) = 'elizabeth@clickin360.com';
