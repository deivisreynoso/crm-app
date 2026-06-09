-- Sync teammate display names into user_profiles for timeline author resolution.

INSERT INTO user_profiles (id, email, display_name, updated_at)
SELECT
  tm.member_user_id,
  tm.email,
  COALESCE(NULLIF(TRIM(tm.display_name), ''), tm.email),
  NOW()
FROM team_members tm
WHERE tm.member_user_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(
    NULLIF(TRIM(EXCLUDED.display_name), ''),
    user_profiles.display_name,
    EXCLUDED.email
  ),
  updated_at = NOW();

UPDATE notes n
SET created_by_display_name = COALESCE(
  NULLIF(TRIM(tm.display_name), ''),
  NULLIF(TRIM(p.display_name), ''),
  tm.email,
  p.email
)
FROM team_members tm
LEFT JOIN user_profiles p ON p.id = tm.member_user_id
WHERE n.created_by = tm.member_user_id
  AND COALESCE(NULLIF(TRIM(n.created_by_display_name), ''), '') = '';
