-- Backfill timeline author labels from profiles and team member records.

UPDATE notes n
SET created_by_display_name = src.label
FROM (
  SELECT
    n2.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(tm.display_name), ''),
      NULLIF(TRIM(p.email), ''),
      NULLIF(TRIM(tm.email), '')
    ) AS label
  FROM notes n2
  LEFT JOIN user_profiles p ON p.id = n2.created_by
  LEFT JOIN team_members tm ON tm.member_user_id = n2.created_by
  WHERE n2.created_by IS NOT NULL
) AS src
WHERE n.id = src.id
  AND src.label IS NOT NULL
  AND COALESCE(NULLIF(TRIM(n.created_by_display_name), ''), '') = '';

UPDATE activities a
SET created_by_display_name = src.label
FROM (
  SELECT
    a2.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(tm.display_name), ''),
      NULLIF(TRIM(p.email), ''),
      NULLIF(TRIM(tm.email), '')
    ) AS label
  FROM activities a2
  LEFT JOIN user_profiles p ON p.id = a2.created_by
  LEFT JOIN team_members tm ON tm.member_user_id = a2.created_by
  WHERE a2.created_by IS NOT NULL
) AS src
WHERE a.id = src.id
  AND src.label IS NOT NULL
  AND COALESCE(NULLIF(TRIM(a.created_by_display_name), ''), '') = '';
