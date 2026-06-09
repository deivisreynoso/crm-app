-- Re-attribute contact notes to Elizabeth Reynoso (team member).
-- Run in Supabase SQL editor after confirming which rows she actually created.
--
-- Elizabeth member_user_id: be6334bf-0947-4f85-8301-57dbd6460970
-- Workspace owner (Deivis) id: 98826477-4944-4894-acae-2d6543e35180
--
-- June 9, 2026 ~11:00–11:27 PM Mexico City (05:00–05:27 UTC) — likely Elizabeth:

UPDATE notes
SET
  created_by = 'be6334bf-0947-4f85-8301-57dbd6460970',
  created_by_display_name = 'Elizabeth Reynoso'
WHERE id IN (
  '654b7e2e-b2a4-4fcb-b043-5f8da3c29b98', -- Mandar factura
  'd6fac3cf-b904-4aad-bc91-fc0d87c2db86', -- Lista de requerimientos para iniciar el proyecto
  '5928f676-902b-4871-878b-3895447e6f9f'  -- Establecer junta de seguimiento
);

-- Verify:
SELECT id, LEFT(content, 50) AS content, created_by, created_by_display_name, created_at
FROM notes
WHERE id IN (
  '654b7e2e-b2a4-4fcb-b043-5f8da3c29b98',
  'd6fac3cf-b904-4aad-bc91-fc0d87c2db86',
  '5928f676-902b-4871-878b-3895447e6f9f'
);

-- Add more note ids to the IN (...) list if Elizabeth created other rows.
-- Leave Deivis-owned notes unchanged (created_by stays 98826477-...).
